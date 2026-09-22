import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Env } from '../../../config/env';
import type { JsonRequest } from '../ai.types';
import { AiProviderError, resolveProviderSettings } from './ai-provider';
import { conformToSchema, extractJson } from './json-schema.util';
import { OpenAiCompatibleProvider, toChatMessages } from './openai-compatible.provider';

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
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    });
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
        if (parsed.stream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          for (const piece of ['We request ', '50,000 USD.']) {
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
          }
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

  const provider = () =>
    new OpenAiCompatibleProvider({ provider: 'gemini', apiKey: 'test-key', model: 'm', baseUrl });

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

  it('turns a 429 into a rate-limit error', async () => {
    status = 429;
    await expect(provider().generateJson(jsonRequest)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
    await expect(provider().generateJson(jsonRequest)).rejects.toBeInstanceOf(AiProviderError);
  });
});
