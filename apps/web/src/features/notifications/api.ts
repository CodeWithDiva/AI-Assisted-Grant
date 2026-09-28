import type { NotificationView } from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const notificationsApi = {
  list: () => apiFetch<NotificationView[]>('/notifications'),
  /** Without ids, everything unread is marked read. */
  markRead: (ids?: string[]) =>
    apiFetch<void>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : {}),
    }),
};
