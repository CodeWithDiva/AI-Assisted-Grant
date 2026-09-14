export const ACCESS_TOKEN_COOKIE = 'gp_access';
export const REFRESH_TOKEN_COOKIE = 'gp_refresh';

export const ACCESS_TOKEN_TTL = '15m';
export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

export const REFRESH_TOKEN_DAYS = 7;
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

/** Cookies are only sent to the auth routes that need the refresh token. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
