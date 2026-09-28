import type { CreateDeadlineInput, DeadlineView, UpdateDeadlineInput } from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const deadlinesApi = {
  list: (orgId: string) => apiFetch<DeadlineView[]>(`/orgs/${orgId}/deadlines`),

  create: (orgId: string, body: CreateDeadlineInput) =>
    apiFetch<DeadlineView>(`/orgs/${orgId}/deadlines`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (orgId: string, deadlineId: string, body: UpdateDeadlineInput) =>
    apiFetch<DeadlineView>(`/orgs/${orgId}/deadlines/${deadlineId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (orgId: string, deadlineId: string) =>
    apiFetch<void>(`/orgs/${orgId}/deadlines/${deadlineId}`, { method: 'DELETE' }),

  icsUrl: (orgId: string, deadlineId: string) =>
    `${API_BASE}/orgs/${orgId}/deadlines/${deadlineId}/ics`,

  runReminders: (orgId: string) =>
    apiFetch<{ sent: number }>(`/orgs/${orgId}/deadlines/run-reminders`, { method: 'POST' }),
};
