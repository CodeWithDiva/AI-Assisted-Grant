export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  /** Whether an AI provider is set up, so the UI can explain why AI buttons fail. */
  ai: 'configured' | 'missing';
  /** e.g. "gemini (gemini-3.8-flash)"; null when AI is off. */
  aiProvider: string | null;
  version: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
