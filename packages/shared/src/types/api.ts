export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  /** Whether ANTHROPIC_API_KEY is set, so the UI can explain why AI buttons fail. */
  ai: 'configured' | 'missing';
  version: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
