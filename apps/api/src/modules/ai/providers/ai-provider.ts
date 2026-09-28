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
  /**
   * `onRestart` is called when a stream broke off part-way and is being written again, so
   * the caller can discard the text it has shown so far.
   */
  streamText(
    request: TextRequest,
    onDelta: (delta: string) => void,
    onRestart?: () => void,
  ): Promise<ProviderResult<string>>;
  generateJson<T>(request: JsonRequest): Promise<ProviderResult<T>>;
}

/** Thrown by providers so AiService can map failures to a user-facing message. */
export class AiProviderError extends Error {
  /** The provider's allowance for the day is used up; only another model can help. */
  dailyLimit = false;
  /** Failed after part of the answer had already been streamed. */
  midStream = false;

  constructor(
    message: string,
    readonly kind: 'rate_limited' | 'auth' | 'provider' | 'bad_output' | 'model_unavailable',
    /** Busy or briefly unavailable: worth trying again, or trying another model. */
    readonly retryable = false,
  ) {
    super(message);
  }
}

export interface ProviderSettings {
  provider: NonNullable<Env['AI_PROVIDER']>;
  apiKey: string | undefined;
  model: string;
  /** Tried in order when the main model stays busy; free tiers are often overloaded. */
  fallbackModels: string[];
  baseUrl: string | undefined;
}

/** Endpoints and default models for the providers with a free tier. */
const PRESETS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // Each model has its own free daily allowance (gemini-3.8-flash: 20 requests a day), so
    // the fallbacks also stretch the free tier. 3.6 leads: good writing, larger allowance.
    model: 'gemini-3.6-flash',
    fallbackModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-120b',
    fallbackModels: ['llama-3.3-70b-versatile'],
  },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: undefined, fallbackModels: [] },
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
    return {
      provider,
      apiKey,
      model: env.AI_MODEL ?? env.ANTHROPIC_MODEL,
      fallbackModels: [],
      baseUrl: undefined,
    };
  }

  const preset = provider === 'openai-compatible' ? undefined : PRESETS[provider];
  const model = env.AI_MODEL ?? preset?.model;
  const baseUrl = env.AI_BASE_URL ?? preset?.baseUrl;
  // Ollama runs locally and needs no key; the hosted services do.
  if (!model || !baseUrl || (provider !== 'ollama' && !env.AI_API_KEY)) return null;

  const fallbacks = env.AI_FALLBACK_MODEL
    ? env.AI_FALLBACK_MODEL.split(',').map((name) => name.trim())
    : [...(preset?.fallbackModels ?? [])];
  return {
    provider,
    apiKey: env.AI_API_KEY,
    model,
    fallbackModels: fallbacks.filter((name) => name && name !== 'none' && name !== model),
    baseUrl: baseUrl.replace(/\/+$/, ''),
  };
}
