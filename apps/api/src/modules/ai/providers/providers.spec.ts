import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../../../config/env';
import type { JsonRequest } from '../ai.types';
import { AiProviderError, resolveProviderSettings } from './ai-provider';
import { conformToSchema, extractJson } from './json-schema.util';
import {
  OpenAiCompatibleProvider,
  retryDelays,
  toChatMessages,
} from './openai-compatible.provider';

const env = (values: Partial<Env>) => ({ ANTHROPIC_MODEL: 'claude-opus-5', ...values }) as Env;

describe('resolveProviderSettings', () => {
  it('is off when nothing is set', () => {
    expect(resolveProviderSettings(env({}))).toBeNull();
  });

  it('keeps Anthropic as the default when only its key is set', () => {
    expect(resolveProviderSettings(env({ ANTHROPIC_API_KEY: 'sk-ant' }))).toMatchObject({
      provider: 'anthropic',
      model: 'claude-opus-5',
    });
  });

  it('fills in the endpoint and model for the free providers', () => {
    expect(resolveProviderSettings(env({ AI_PROVIDER: 'gemini', AI_API_KEY: 'k' }))).toEqual({
      provider: 'gemini',
      apiKey: 'k',
      model: 'gemini-3.6-flash',
      fallbackModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    });
    expect(
      resolveProviderSettings(
        env({ AI_PROVIDER: 'gemini', AI_API_KEY: 'k', AI_FALLBACK_MODEL: 'none' }),
      )?.fallbackModels,
    ).toEqual([]);
    expect(
      resolveProviderSettings(
        env({ AI_PROVIDER: 'gemini', AI_API_KEY: 'k', AI_FALLBACK_MODEL: 'a, b' }),
      )?.fallbackModels,
    ).toEqual(['a', 'b']);
    expect(
      resolveProviderSettings(env({ AI_PROVIDER: 'groq', AI_API_KEY: 'k', AI_MODEL: 'x' })),
    ).toMatchObject({ baseUrl: 'https://api.groq.com/openai/v1', model: 'x' });
  });

  it('needs a key for hosted providers but not for a local Ollama', () => {
    expect(resolveProviderSettings(env({ AI_PROVIDER: 'gemini' }))).toBeNull();
    expect(
      resolveProviderSettings(env({ AI_PROVIDER: 'ollama', AI_MODEL: 'llama3.1:8b' })),
    ).toMatchObject({ baseUrl: 'http://localhost:11434/v1', apiKey: undefined });
  });
});

describe('conformToSchema', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: ['string', 'null'] },
      amount: { type: ['number', 'null'] },
      severity: { type: 'string', enum: ['ERROR', 'WARNING'] },
      tags: { type: 'array', items: { type: 'string' } },
      score: { type: 'integer' },
    },
  };

  it('fills missing keys, parses numbers written as text and fixes enum case', () => {
    expect(
      conformToSchema(
        { amount: 'USD 40,000', severity: 'warning', score: '4.6', extra: 1 },
        schema,
      ),
    ).toEqual({ name: null, amount: 40000, severity: 'WARNING', tags: [], score: 5 });
  });

  it('wraps a single value where a list is expected', () => {
    expect(conformToSchema('one', { type: 'array', items: { type: 'string' } })).toEqual(['one']);
  });
});

describe('extractJson', () => {
  it('reads JSON inside a code fence or surrounded by prose', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":2} Hope this helps')).toEqual({ a: 2 });
  });

  it('fails when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});

describe('toChatMessages', () => {
  it('joins system blocks and adds the extra instructions', () => {
    const messages = toChatMessages(
      {
        organizationId: 'o',
        kind: 'SECTION_DRAFT',
        promptVersion: 'v',
        system: [{ type: 'text', text: 'Be precise.' }],
        messages: [{ role: 'user', content: 'Hello' }],
      },
      'Answer in JSON.',
    );
    expect(messages).toEqual([
      { role: 'system', content: 'Be precise.\n\nAnswer in JSON.' },
      { role: 'user', content: 'Hello' },
    ]);
  });
});

describe('OpenAiCompatibleProvider against a fake server', () => {
  let server: Server;
  let baseUrl: string;
  const requests: Record<string, unknown>[] = [];
  let nextJsonReplies: string[] = [];
  let status = 200;
  /** Models that answer 503 "high demand", as Gemini's free tier often does. */
  let busyModels = new Set<string>();
  /** Models the account may not use (404). */
  let missingModels = new Set<string>();
  /** Models whose free daily allowance is used up (429 with a per-day quota). */
  let exhaustedModels = new Set<string>();
  /** Makes the stream end without a finish reason, like a dropped connection. */
  let cutStream = false;
  let cutTimes = Infinity;
  let busyTimes = Infinity;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsed = JSON.parse(body);
        requests.push({ ...parsed, authorization: req.headers.authorization });
        if (status !== 200) {
          res.writeHead(status).end('{"error":{"message":"quota"}}');
          return;
        }
        if (exhaustedModels.has(parsed.model)) {
          res.writeHead(429).end('{"error":{"details":[{"quotaId":"RequestsPerDay-FreeTier"}]}}');
          return;
        }
        if (missingModels.has(parsed.model)) {
          res.writeHead(404).end('{"error":{"message":"no longer available"}}');
          return;
        }
        if (busyModels.has(parsed.model) && busyTimes-- > 0) {
          res.writeHead(503).end('{"error":{"message":"high demand"}}');
          return;
        }
        if (parsed.stream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          for (const piece of ['We request ', '50,000 USD.']) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
          }
          if (cutStream && cutTimes-- > 0) return res.end();
          res.write(
            `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
          );
          res.write(
            `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 5 } })}\n\n`,
          );
          res.end('data: [DONE]\n\n');
          return;
        }
        const content = nextJsonReplies.shift() ?? '{}';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content } }],
            usage: { prompt_tokens: 100, completion_tokens: 20 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    status = 200;
    busyModels = new Set();
    missingModels = new Set();
    exhaustedModels = new Set();
    cutStream = false;
    cutTimes = Infinity;
    busyTimes = Infinity;
    retryDelays.ms = [0, 0];
  });

  const provider = () =>
    new OpenAiCompatibleProvider({
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'm',
      fallbackModels: ['retired', 'backup'],
      baseUrl,
    });

  const jsonRequest: JsonRequest = {
    organizationId: 'o',
    kind: 'FIT_SCORE',
    promptVersion: 'v',
    system: 'Score it.',
    messages: [{ role: 'user', content: 'Proposal text' }],
    toolName: 'record',
    toolDescription: 'Record the score.',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'integer' },
        reasons: { type: 'array', items: { type: 'string' } },
      },
      required: ['score', 'reasons'],
    },
  };

  it('streams text and reports usage', async () => {
    status = 200;
    const deltas: string[] = [];
    const result = await provider().streamText({ ...jsonRequest, kind: 'SECTION_DRAFT' }, (delta) =>
      deltas.push(delta),
    );
    expect(deltas).toEqual(['We request ', '50,000 USD.']);
    expect(result).toEqual({
      data: 'We request 50,000 USD.',
      usage: { inputTokens: 12, outputTokens: 5 },
    });
    expect(requests.at(-1)).toMatchObject({
      model: 'm',
      stream: true,
      authorization: 'Bearer test-key',
    });
  });

  it('asks again once when the first answer is not JSON', async () => {
    status = 200;
    nextJsonReplies = ['Sure! The score is high.', '{"score": "82", "reasons": ["Strong fit"]}'];
    const result = await provider().generateJson<{ score: number; reasons: string[] }>(jsonRequest);
    expect(result.data).toEqual({ score: 82, reasons: ['Strong fit'] });
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 40 });
    expect(requests.at(-1)).toMatchObject({ response_format: { type: 'json_object' } });
  });

  it('tries a busy model again before giving up on it', async () => {
    busyModels = new Set(['m']);
    busyTimes = 2;
    nextJsonReplies = ['{"score": 70, "reasons": []}'];
    const before = requests.length;
    await expect(provider().generateJson(jsonRequest)).resolves.toMatchObject({
      data: { score: 70 },
    });
    expect(requests.slice(before).map((r) => r.model)).toEqual(['m', 'm', 'm']);
  });

  it('works down the fallback models while each stays busy', async () => {
    busyModels = new Set(['m', 'retired']);
    const before = requests.length;
    const deltas: string[] = [];
    await provider().streamText(jsonRequest, (delta) => deltas.push(delta));
    expect(deltas.join('')).toBe('We request 50,000 USD.');
    expect(requests.slice(before).map((r) => r.model)).toEqual([
      'm',
      'm',
      'm',
      'retired',
      'retired',
      'retired',
      'backup',
    ]);
  });

  it('skips a fallback model the account cannot use', async () => {
    busyModels = new Set(['m']);
    missingModels = new Set(['retired']);
    const before = requests.length;
    await provider().streamText(jsonRequest, () => undefined);
    expect(requests.slice(before).map((r) => r.model)).toEqual([
      'm',
      'm',
      'm',
      'retired',
      'backup',
    ]);
  });

  it('moves straight on when a model has used its daily allowance', async () => {
    exhaustedModels = new Set(['m']);
    const before = requests.length;
    await provider().streamText(jsonRequest, () => undefined);
    expect(requests.slice(before).map((r) => r.model)).toEqual(['m', 'retired']);
  });

  it('writes a dropped stream again once, telling the caller to clear its text', async () => {
    cutStream = true;
    cutTimes = 1;
    const deltas: string[] = [];
    let restarts = 0;
    const result = await provider().streamText(
      jsonRequest,
      (delta) => deltas.push(delta),
      () => {
        restarts++;
        deltas.length = 0;
      },
    );
    expect(restarts).toBe(1);
    expect(deltas.join('')).toBe('We request 50,000 USD.');
    expect(result.data).toBe('We request 50,000 USD.');
  });

  it('gives up when the stream breaks off twice', async () => {
    cutStream = true;
    await expect(provider().streamText(jsonRequest, () => undefined)).rejects.toMatchObject({
      kind: 'bad_output',
    });
  });

  it('reports "busy" when every model is busy', async () => {
    busyModels = new Set(['m', 'retired', 'backup']);
    await expect(provider().generateJson(jsonRequest)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('turns a 429 into a rate-limit error', async () => {
    status = 429;
    await expect(provider().generateJson(jsonRequest)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
    await expect(provider().generateJson(jsonRequest)).rejects.toBeInstanceOf(AiProviderError);
  });
});
