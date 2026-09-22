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
    for await (const chunk of readEvents(response)) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        onDelta(delta);
      }
      usage = chunk.usage ?? chunk.x_groq?.usage ?? usage;
    }

    if (!text.trim()) throw new AiProviderError('The AI returned an empty answer', 'bad_output');
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

  private async post(body: Record<string, unknown>): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.apiKey ? { Authorization: `Bearer ${this.settings.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: this.model, ...body }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new AiProviderError(
        `Could not reach the AI service: ${(error as Error).message}`,
        'provider',
      );
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      const message = `AI service answered ${response.status}: ${detail}`;
      if (response.status === 429) throw new AiProviderError(message, 'rate_limited');
      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError(message, 'auth');
      }
      throw new AiProviderError(message, 'provider');
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
  choices?: { delta?: { content?: string | null } }[];
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
      try {
        yield JSON.parse(data) as StreamChunk;
      } catch {
        // A keep-alive or partial line; the next one carries on.
      }
    }
  }
}

function toUsage(usage: ChatUsage | undefined): ProviderUsage {
  return { inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 };
}
