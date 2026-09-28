import Anthropic from '@anthropic-ai/sdk';
import type { JsonRequest, TextRequest } from '../ai.types';
import { AiProviderError, type AiProvider, type ProviderResult } from './ai-provider';

const DEFAULT_MAX_TOKENS = 8000;

/** Claude through the official SDK: adaptive thinking, prompt caching, strict tool output. */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async streamText(
    request: TextRequest,
    onDelta: (delta: string) => void,
    // The SDK's stream does not break off part-way, so there is nothing to restart.
    _onRestart?: () => void,
  ): Promise<ProviderResult<string>> {
    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: request.messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: request.effort ?? 'high' },
      });
      stream.on('text', onDelta);
      const message = await stream.finalMessage();

      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return { data: text, usage: toUsage(message.usage) };
    } catch (error) {
      throw toProviderError(error);
    }
  }

  /** Claude answers by calling a tool whose schema we define, so the result is valid JSON. */
  async generateJson<T>(request: JsonRequest): Promise<ProviderResult<T>> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: request.messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: request.effort ?? 'high' },
        tools: [
          {
            name: request.toolName,
            description: request.toolDescription,
            input_schema: request.schema,
            strict: true,
          },
        ],
        tool_choice: { type: 'tool', name: request.toolName },
      });

      const toolUse = message.content.find((block) => block.type === 'tool_use');
      if (!toolUse) throw new AiProviderError('The AI returned no structured result', 'bad_output');

      return { data: toolUse.input as T, usage: toUsage(message.usage) };
    } catch (error) {
      throw toProviderError(error);
    }
  }
}

function toUsage(usage: { input_tokens: number; output_tokens: number }) {
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
}

function toProviderError(error: unknown): Error {
  if (error instanceof AiProviderError) return error;
  if (error instanceof Anthropic.RateLimitError) {
    return new AiProviderError(error.message, 'rate_limited');
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiProviderError(error.message, 'auth');
  }
  if (error instanceof Anthropic.APIError) return new AiProviderError(error.message, 'provider');
  return error instanceof Error ? error : new Error('AI request failed');
}
