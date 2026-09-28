import type {
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  HealthResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateAccountInput,
} from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const authApi = {
  me: () => apiFetch<AuthUser>('/auth/me'),
  login: (body: LoginInput) =>
    apiFetch<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterInput) =>
    apiFetch<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
  updateAccount: (body: UpdateAccountInput) =>
    apiFetch<AuthUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body: ChangePasswordInput) =>
    apiFetch<void>('/auth/password', { method: 'POST', body: JSON.stringify(body) }),
  changeEmail: (body: ChangeEmailInput) =>
    apiFetch<AuthUser>('/auth/email', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: ForgotPasswordInput) =>
    apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: ResetPasswordInput) =>
    apiFetch<AuthUser>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  health: () => apiFetch<HealthResponse>('/health'),
};

/** Only allow in-app redirects after sign-in, never an absolute URL from the query string. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}
