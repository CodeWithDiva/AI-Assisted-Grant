import type { JsonRequest, TextRequest } from '../ai.types';
import {
  AiProviderError,
  type AiProvider,
  type ProviderResult,
  type ProviderSettings,
  type ProviderUsage,
} from './ai-provider';
import { conformToSchema, extractJson, type JsonSchema } from './json-schema.util';

const DEFAULT_MAX_TOKENS = 8000;
const TIMEOUT_MS = 180_000;
/** Waits before the 2nd and 3rd try of a busy model. Tests set it to zero. */
export const retryDelays = { ms: [1500, 4000] };
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

/**
 * Any service that speaks the OpenAI chat-completions API: Google Gemini, Groq, OpenRouter
 * or a local Ollama. Used for the free tiers; plain fetch, so no extra SDK is needed.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;
  readonly model: string;

  constructor(private readonly settings: ProviderSettings) {
    this.name = settings.provider;
    this.model = settings.model;
  }

  async streamText(
    request: TextRequest,
    onDelta: (delta: string) => void,
    onRestart?: () => void,
  ): Promise<ProviderResult<string>> {
    // Free tiers sometimes drop a stream part-way; write it again once before giving up.
    for (let attempt = 1; ; attempt++) {
      let sentText = false;
      try {
        return await this.streamOnce(request, (delta) => {
          sentText = true;
          onDelta(delta);
        });
      } catch (error) {
        const brokenOff =
          error instanceof AiProviderError && (error.kind === 'bad_output' || error.midStream);
        if (!brokenOff || attempt >= 2) throw error;
        if (sentText) onRestart?.();
      }
    }
  }

  private async streamOnce(
    request: TextRequest,
    onDelta: (delta: string) => void,
  ): Promise<ProviderResult<string>> {
    const response = await this.post({
      messages: toChatMessages(request),
      max_tokens: this.maxTokens(request),
      stream: true,
      // Gemini reports token usage in the last chunk only when asked.
      ...(this.name === 'gemini' ? { stream_options: { include_usage: true } } : {}),
    });

    let text = '';
    let usage: ChatUsage | undefined;
    let finishReason: string | undefined;
    for await (const chunk of readEvents(response)) {
      if (chunk.error) {
        const error = new AiProviderError(
          `The AI stopped part-way: ${chunk.error.message ?? 'unknown error'}`,
          'provider',
        );
        error.midStream = true;
        throw error;
      }
      const choice = chunk.choices?.[0];
      const delta = choice?.delta?.content;
      if (delta) {
        text += delta;
        onDelta(delta);
      }
      finishReason = choice?.finish_reason ?? finishReason;
      usage = chunk.usage ?? chunk.x_groq?.usage ?? usage;
    }

    if (!text.trim()) throw new AiProviderError('The AI returned an empty answer', 'bad_output');
    // A stream that ends without "stop" was cut off; saving it would store half a section.
    if (finishReason !== 'stop') {
      throw new AiProviderError(
        `The AI stopped before finishing (${finishReason ?? 'connection ended'})`,
        'bad_output',
      );
    }
    return { data: text.trim(), usage: toUsage(usage) };
  }

  async generateJson<T>(request: JsonRequest): Promise<ProviderResult<T>> {
    const messages = toChatMessages(request, jsonInstructions(request));
    const usage: ProviderUsage = { inputTokens: 0, outputTokens: 0 };

    // One retry: a model that slips into prose usually gets it right when shown the error.
    for (let attempt = 1; ; attempt++) {
      const response = await this.post({
        messages,
        max_tokens: this.maxTokens(request),
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const body = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: ChatUsage;
      };
      const reply = body.choices?.[0]?.message?.content ?? '';
      const callUsage = toUsage(body.usage);
      usage.inputTokens += callUsage.inputTokens;
      usage.outputTokens += callUsage.outputTokens;

      try {
        const parsed = extractJson(reply);
        return { data: conformToSchema(parsed, request.schema as JsonSchema) as T, usage };
      } catch (error) {
        if (attempt >= 2) {
          throw new AiProviderError(
            `The AI did not return valid JSON: ${(error as Error).message}`,
            'bad_output',
          );
        }
        messages.push(
          { role: 'assistant', content: reply },
          {
            role: 'user',
            content: `That was not a valid JSON object (${(error as Error).message}). Reply again with only the JSON object.`,
          },
        );
      }
    }
  }

  /**
   * Gemini's Flash models think before answering and that counts against max_tokens, so it
   * gets headroom. Groq's free tier rejects requests whose max_tokens exceed its per-minute
   * budget, so the others keep the requested size.
   */
  private maxTokens(request: TextRequest): number {
    const requested = request.maxTokens ?? DEFAULT_MAX_TOKENS;
    return this.name === 'gemini'
      ? Math.min(Math.max(requested, DEFAULT_MAX_TOKENS) * 2, 32_000)
      : requested;
  }

  /**
   * Free tiers are often briefly overloaded (503) or rate-limited (429). A busy model is
   * tried three times with a pause, then each fallback model the same way; a model the
   * account cannot use (404) is skipped. Nothing has been streamed to the user before a
   * request succeeds, so retrying is safe.
   */
  private async post(body: Record<string, unknown>): Promise<Response> {
    const models = [this.model, ...this.settings.fallbackModels];
    let lastError: unknown;

    for (const model of models) {
      for (let attempt = 0; attempt <= retryDelays.ms.length; attempt++) {
        if (attempt > 0) await sleep(retryDelays.ms[attempt - 1]);
        try {
          return await this.send(model, body);
        } catch (error) {
          if (!(error instanceof AiProviderError)) throw error;
          // Keep the more useful "busy" error rather than a later "model not found".
          if (!lastError || error.kind !== 'model_unavailable') lastError = error;
          // Waiting does not help a retired model or a used-up daily allowance.
          if (error.kind === 'model_unavailable' || error.dailyLimit) break;
          if (!error.retryable) throw error;
        }
      }
    }
    throw lastError;
  }

  private async send(model: string, body: Record<string, unknown>): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.apiKey ? { Authorization: `Bearer ${this.settings.apiKey}` } : {}),
        },
        body: JSON.stringify({ model, ...body }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // A timeout is not retried: the user has already waited three minutes.
      const timedOut = (error as Error).name === 'TimeoutError';
      throw new AiProviderError(
        `Could not reach the AI service: ${(error as Error).message}`,
        'provider',
        !timedOut,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const message = `AI service (${model}) answered ${response.status}: ${body.slice(0, 300)}`;
      const retryable = RETRYABLE_STATUS.has(response.status);
      if (response.status === 429) {
        const error = new AiProviderError(message, 'rate_limited', true);
        // Gemini names the quota, e.g. "GenerateRequestsPerDayPerProjectPerModel-FreeTier".
        error.dailyLimit = /PerDay/i.test(body);
        throw error;
      }
      if (response.status === 503) throw new AiProviderError(message, 'rate_limited', true);
      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError(message, 'auth');
      }
      if (response.status === 404) throw new AiProviderError(message, 'model_unavailable');
      throw new AiProviderError(message, 'provider', retryable);
    }
    return response;
  }
}

/** Flattens the Anthropic-style system blocks and message content into plain strings. */
export function toChatMessages(request: TextRequest, extraSystem?: string): ChatMessage[] {
  const system = [
    typeof request.system === 'string'
      ? request.system
      : request.system.map((block) => block.text).join('\n\n'),
    extraSystem,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    { role: 'system', content: system },
    ...request.messages.map((message) => ({
      role: message.role,
      content:
        typeof message.content === 'string'
          ? message.content
          : message.content
              .map((block) => (block.type === 'text' ? block.text : ''))
              .filter(Boolean)
              .join('\n\n'),
    })),
  ];
}

function jsonInstructions(request: JsonRequest): string {
  return [
    `Task: ${request.toolDescription}`,
    'Answer with a single JSON object and nothing else: no prose, no code fences.',
    'It must match this JSON Schema. Use null where the schema allows it and the information is not given; never invent values.',
    JSON.stringify(request.schema),
  ].join('\n');
}

interface StreamChunk {
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  error?: { message?: string };
  usage?: ChatUsage;
  x_groq?: { usage?: ChatUsage };
}

/** Parses the `data: {...}` lines of an OpenAI-style event stream. */
async function* readEvents(response: Response): AsyncGenerator<StreamChunk> {
  if (!response.body) return;
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const bytes of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(bytes, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue; // a keep-alive or partial line; the next one carries on
      }
      // Gemini wraps errors in an array: [{ "error": { ... } }].
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) yield item as StreamChunk;
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toUsage(usage: ChatUsage | undefined): ProviderUsage {
  return { inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 };
}
