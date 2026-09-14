import Anthropic from '@anthropic-ai/sdk';
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

const DEFAULT_MAX_TOKENS = 8000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = config.get('ANTHROPIC_MODEL', { infer: true });
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY is not set — AI features will return 503');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /** Free-form generation (proposal sections, rewrites). Streams so long outputs cannot time out. */
  async generateText(request: TextRequest): Promise<AiResult<string>> {
    const client = this.requireClient();
    const startedAt = Date.now();

    try {
      const stream = client.messages.stream({
        model: this.model,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: request.system,
        messages: request.messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: request.effort ?? 'high' },
      });
      const message = await stream.finalMessage();

      const text = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return this.record(request, message.usage, startedAt, text);
    } catch (error) {
      await this.recordFailure(request, startedAt, error);
      throw this.toHttpError(error);
    }
  }

  /**
   * Structured generation (RFP extraction, compliance scoring). Claude answers by calling a
   * tool whose schema we define, so the result is valid JSON rather than prose to parse.
   */
  async generateJson<T>(request: JsonRequest): Promise<AiResult<T>> {
    const client = this.requireClient();
    const startedAt = Date.now();

    try {
      const message = await client.messages.create({
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
      if (!toolUse) {
        throw new InternalServerErrorException('The AI returned no structured result');
      }

      return this.record(request, message.usage, startedAt, toolUse.input as T);
    } catch (error) {
      await this.recordFailure(request, startedAt, error);
      throw this.toHttpError(error);
    }
  }

  private async record<T>(
    request: TextRequest | JsonRequest,
    usage: { input_tokens: number; output_tokens: number },
    startedAt: number,
    data: T,
  ): Promise<AiResult<T>> {
    const generation = await this.prisma.aiGeneration.create({
      data: {
        organizationId: request.organizationId,
        userId: request.userId,
        kind: request.kind,
        model: this.model,
        promptVersion: request.promptVersion,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        latencyMs: Date.now() - startedAt,
        status: 'SUCCESS',
      },
      select: { id: true },
    });

    return {
      data,
      generationId: generation.id,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  }

  private async recordFailure(
    request: TextRequest | JsonRequest,
    startedAt: number,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown AI error';
    this.logger.error(`AI ${request.kind} failed: ${message}`);

    await this.prisma.aiGeneration
      .create({
        data: {
          organizationId: request.organizationId,
          userId: request.userId,
          kind: request.kind,
          model: this.model,
          promptVersion: request.promptVersion,
          latencyMs: Date.now() - startedAt,
          status: 'FAILED',
          errorMessage: message.slice(0, 500),
        },
      })
      .catch(() => undefined);
  }

  private requireClient(): Anthropic {
    if (!this.client) {
      throw new ServiceUnavailableException('AI is not configured — ANTHROPIC_API_KEY is missing');
    }
    return this.client;
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof Anthropic.RateLimitError) {
      return new ServiceUnavailableException('The AI service is busy, please try again shortly');
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return new ServiceUnavailableException('The AI API key was rejected');
    }
    if (error instanceof Anthropic.APIError) {
      return new ServiceUnavailableException('The AI service could not complete this request');
    }
    return error instanceof Error ? error : new InternalServerErrorException('AI request failed');
  }
}
