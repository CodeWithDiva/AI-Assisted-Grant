import { z } from 'zod';

/** Empty values in .env files (`KEY=`) mean "not set". */
const optional = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    // Proxies in front of the API (Render = 1; Vercel proxy + Render = 2). Lets rate limits
    // see each visitor's own IP instead of the proxy's.
    // Sign-in, sign-up and password attempts per visitor per minute. Keep 10 in production;
    // the browser tests raise it because they sign in many times a minute.
    AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),

    // AI provider. Unset = Anthropic when ANTHROPIC_API_KEY is present, otherwise AI is off.
    // gemini / groq / ollama / openai-compatible use the OpenAI-style chat API (free tiers).
    AI_PROVIDER: z
      .enum(['anthropic', 'gemini', 'groq', 'ollama', 'openai-compatible'])
      .optional()
      .or(z.literal('').transform(() => undefined)),
    AI_API_KEY: optional,
    AI_MODEL: optional,
    // Comma-separated models tried when AI_MODEL is overloaded; "none" turns this off.
    // Gemini and Groq have defaults.
    AI_FALLBACK_MODEL: optional,
    AI_BASE_URL: optional,

    ANTHROPIC_API_KEY: optional,
    ANTHROPIC_MODEL: z.string().default('claude-opus-5'),

    STORAGE_DRIVER: z.enum(['local', 'database', 's3']).default('local'),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(20),

    // S3 or any S3-compatible store (Cloudflare R2, Backblaze B2, MinIO)
    S3_BUCKET: optional,
    S3_REGION: optional,
    S3_ENDPOINT: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    EMAIL_DRIVER: z.enum(['console', 'resend', 'brevo']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    BREVO_API_KEY: optional,

    // Lets a scheduler outside the API (GitHub Actions) run the daily reminder job.
    CRON_SECRET: optional,
    EMAIL_FROM: z.string().default('noreply@example.com'),

    // Error reporting; leave SENTRY_DSN empty to turn it off.
    SENTRY_DSN: optional,
    SENTRY_ENVIRONMENT: optional,
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === 'openai-compatible') {
      for (const key of ['AI_BASE_URL', 'AI_MODEL'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when AI_PROVIDER=openai-compatible`,
          });
        }
      }
    }
    if (env.AI_PROVIDER === 'ollama' && !env.AI_MODEL) {
      ctx.addIssue({
        code: 'custom',
        path: ['AI_MODEL'],
        message: 'AI_MODEL is required when AI_PROVIDER=ollama (e.g. llama3.1:8b)',
      });
    }
    if (env.STORAGE_DRIVER !== 's3') return;
    for (const key of ['S3_BUCKET', 'S3_REGION'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when STORAGE_DRIVER=s3`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
