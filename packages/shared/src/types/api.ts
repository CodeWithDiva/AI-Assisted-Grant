export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  version: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
