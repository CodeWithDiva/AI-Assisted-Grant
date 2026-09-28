import type { ActivityEntry } from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const activityApi = {
  list: (orgId: string, before?: string) =>
    apiFetch<ActivityEntry[]>(
      `/orgs/${orgId}/activity${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
};
