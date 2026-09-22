const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(res.status, message ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  return handle<T>(res);
}

/** File uploads must not set Content-Type — the browser adds the multipart boundary itself. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  return handle<T>(res);
}

const EVENT_SEPARATOR = '\n\n';

/**
 * Reads a server-sent-event stream (AI drafting). `onDelta` fires for each chunk of text;
 * `onRestart` when the server starts the text again after a dropped AI stream. The promise
 * resolves with the payload of the final `done` event.
 */
export async function apiStream<T>(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
  onRestart?: () => void,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const failed = await res.json().catch(() => null);
    throw new ApiError(res.status, failed?.message ?? res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split(EVENT_SEPARATOR);
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      const event = lines.find((line) => line.startsWith('event: '))?.slice(7);
      const data = lines.find((line) => line.startsWith('data: '))?.slice(6);
      if (!event || !data) continue;

      const payload = JSON.parse(data);
      if (event === 'delta') onDelta(payload.text as string);
      else if (event === 'restart') onRestart?.();
      else if (event === 'done') result = payload as T;
      else if (event === 'error') throw new ApiError(500, payload.message as string);
    }
  }

  if (!result) throw new ApiError(500, 'The connection closed before the draft finished');
  return result;
}
