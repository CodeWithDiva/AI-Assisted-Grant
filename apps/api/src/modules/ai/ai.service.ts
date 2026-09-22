import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiResult, JsonRequest, TextRequest } from './ai.types';
import {
  AiProviderError,
  resolveProviderSettings,
  type AiProvider,
  type ProviderUsage,
} from './providers/ai-provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: AiProvider | null;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const settings = resolveProviderSettings({
      AI_PROVIDER: config.get('AI_PROVIDER', { infer: true }),
      AI_API_KEY: config.get('AI_API_KEY', { infer: true }),
      AI_MODEL: config.get('AI_MODEL', { infer: true }),
      AI_BASE_URL: config.get('AI_BASE_URL', { infer: true }),
      ANTHROPIC_API_KEY: config.get('ANTHROPIC_API_KEY', { infer: true }),
      ANTHROPIC_MODEL: config.get('ANTHROPIC_MODEL', { infer: true }),
    } as Env);

    if (!settings) {
      this.provider = null;
      this.logger.warn('No AI provider is configured — AI features will return 503');
    } else {
      this.provider =
        settings.provider === 'anthropic'
          ? new AnthropicProvider(settings.apiKey!, settings.model)
          : new OpenAiCompatibleProvider(settings);
      this.logger.log(`AI provider: ${settings.provider} (${settings.model})`);
    }
  }

  get isConfigured(): boolean {
    return this.provider !== null;
  }

  /** Which provider and model answer, for the health check. */
  get description(): { provider: string; model: string } | null {
    return this.provider ? { provider: this.provider.name, model: this.provider.model } : null;
  }

  /** Free-form generation. Streams internally so long outputs cannot time out. */
  async generateText(request: TextRequest): Promise<AiResult<string>> {
    return this.streamText(request, () => undefined);
  }

  /**
   * Same as generateText, but every token is handed to `onDelta` as it arrives so the
   * proposal editor can show the draft being written.
   */
  async streamText(
    request: TextRequest,
    onDelta: (delta: string) => void,
  ): Promise<AiResult<string>> {
    const provider = this.requireProvider();
    const startedAt = Date.now();
    try {
      const result = await provider.streamText(request, onDelta);
      return this.record(provider, request, result.usage, startedAt, result.data);
    } catch (error) {
      await this.recordFailure(provider, request, startedAt, error);
      throw this.toHttpError(error);
    }
  }

  /** Structured generation (RFP extraction, compliance scoring) that matches `schema`. */
  async generateJson<T>(request: JsonRequest): Promise<AiResult<T>> {
    const provider = this.requireProvider();
    const startedAt = Date.now();
    try {
      const result = await provider.generateJson<T>(request);
      return this.record(provider, request, result.usage, startedAt, result.data);
    } catch (error) {
      await this.recordFailure(provider, request, startedAt, error);
      throw this.toHttpError(error);
    }
  }

  private async record<T>(
    provider: AiProvider,
    request: TextRequest | JsonRequest,
    usage: ProviderUsage,
    startedAt: number,
    data: T,
  ): Promise<AiResult<T>> {
    const generation = await this.prisma.aiGeneration.create({
      data: {
        organizationId: request.organizationId,
        userId: request.userId,
        kind: request.kind,
        model: provider.model,
        promptVersion: request.promptVersion,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: Date.now() - startedAt,
        status: 'SUCCESS',
      },
      select: { id: true },
    });

    return {
      data,
      generationId: generation.id,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    };
  }

  private async recordFailure(
    provider: AiProvider,
    request: TextRequest | JsonRequest,
    startedAt: number,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown AI error';
    this.logger.error(`AI ${request.kind} failed (${provider.name}): ${message}`);

    await this.prisma.aiGeneration
      .create({
        data: {
          organizationId: request.organizationId,
          userId: request.userId,
          kind: request.kind,
          model: provider.model,
          promptVersion: request.promptVersion,
          latencyMs: Date.now() - startedAt,
          status: 'FAILED',
          errorMessage: message.slice(0, 500),
        },
      })
      .catch(() => undefined);
  }

  private requireProvider(): AiProvider {
    if (!this.provider) {
      throw new ServiceUnavailableException(
        'AI is not configured — set AI_PROVIDER and AI_API_KEY (or ANTHROPIC_API_KEY)',
      );
    }
    return this.provider;
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof AiProviderError) {
      switch (error.kind) {
        case 'rate_limited':
          return new ServiceUnavailableException(
            'The AI service is busy or the free daily limit is used up — please try again shortly',
          );
        case 'auth':
          return new ServiceUnavailableException('The AI API key was rejected');
        case 'bad_output':
          return new ServiceUnavailableException(
            'The AI gave an answer that could not be used — please try again',
          );
        default:
          return new ServiceUnavailableException('The AI service could not complete this request');
      }
    }
    return error instanceof Error ? error : new InternalServerErrorException('AI request failed');
  }
}
