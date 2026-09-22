import type { Env } from '../../../config/env';
import type { JsonRequest, TextRequest } from '../ai.types';

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderResult<T> {
  data: T;
  usage: ProviderUsage;
}

/** One AI backend. AiService adds logging, usage records and HTTP error mapping on top. */
export interface AiProvider {
  readonly name: string;
  readonly model: string;
  streamText(
    request: TextRequest,
    onDelta: (delta: string) => void,
  ): Promise<ProviderResult<string>>;
  generateJson<T>(request: JsonRequest): Promise<ProviderResult<T>>;
}

/** Thrown by providers so AiService can map failures to a user-facing message. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly kind: 'rate_limited' | 'auth' | 'provider' | 'bad_output',
  ) {
    super(message);
  }
}

export interface ProviderSettings {
  provider: NonNullable<Env['AI_PROVIDER']>;
  apiKey: string | undefined;
  model: string;
  baseUrl: string | undefined;
}

/** Endpoints and default models for the providers with a free tier. */
const PRESETS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.8-flash',
  },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: undefined },
} as const;

/**
 * Works out which provider to use from the environment, or null when AI is switched off.
 * Without AI_PROVIDER, an ANTHROPIC_API_KEY alone keeps the original behaviour.
 */
export function resolveProviderSettings(env: Env): ProviderSettings | null {
  const provider = env.AI_PROVIDER ?? (env.ANTHROPIC_API_KEY ? 'anthropic' : undefined);
  if (!provider) return null;

  if (provider === 'anthropic') {
    const apiKey = env.ANTHROPIC_API_KEY ?? env.AI_API_KEY;
    if (!apiKey) return null;
    return { provider, apiKey, model: env.AI_MODEL ?? env.ANTHROPIC_MODEL, baseUrl: undefined };
  }

  const preset = provider === 'openai-compatible' ? undefined : PRESETS[provider];
  const model = env.AI_MODEL ?? preset?.model;
  const baseUrl = env.AI_BASE_URL ?? preset?.baseUrl;
  // Ollama runs locally and needs no key; the hosted services do.
  if (!model || !baseUrl || (provider !== 'ollama' && !env.AI_API_KEY)) return null;

  return { provider, apiKey: env.AI_API_KEY, model, baseUrl: baseUrl.replace(/\/+$/, '') };
}
