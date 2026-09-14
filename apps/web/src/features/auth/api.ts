import type { AuthUser, LoginInput, RegisterInput } from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const authApi = {
  me: () => apiFetch<AuthUser>('/auth/me'),
  login: (body: LoginInput) =>
    apiFetch<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterInput) =>
    apiFetch<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
};
