import type { NotificationView } from '@grant/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BadgeCheck, CalendarClock, MessageSquare, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Spinner } from '../../components/ui';
import { Popover } from '../../components/ui/menu';
import { useOrgs } from '../organizations/OrgProvider';
import { notificationsApi } from './api';
import { describeNotification } from './describe';

const ICONS = {
  COMMENT_ADDED: MessageSquare,
  PROPOSAL_APPROVED: BadgeCheck,
  PROPOSAL_APPROVAL_WITHDRAWN: BadgeCheck,
  MEMBER_JOINED: UserPlus,
  DEADLINE_REMINDER: CalendarClock,
} as const;

export function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setActiveOrgId } = useOrgs();

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    // New notifications arrive while the tab sits open.
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = notifications.data ?? [];
  const unread = items.filter((item) => !item.readAt).length;

  const open = (item: NotificationView, to: string | null, close: () => void) => {
    if (!item.readAt) markRead.mutate([item.id]);
    close();
    if (!to) return;
    // The notification may be about another organization; switch before navigating.
    const organizationId = item.payload.organizationId;
    if (typeof organizationId === 'string') setActiveOrgId(organizationId);
    navigate(to);
  };

  return (
    <Popover
      align="right"
      width="w-[22rem]"
      label="Notifications"
      trigger={(isOpen) => (
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          className={`relative inline-flex size-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-paper-dark hover:text-ink-900 ${
            isOpen ? 'bg-paper-dark text-ink-900' : ''
          }`}
        >
          <Bell className="size-[18px]" strokeWidth={1.8} />
          {unread ? (
            <span className="tabular absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-flag-red px-1 font-mono text-[10px] leading-4 text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="eyebrow">Notifications</span>
            {unread ? (
              <button
                type="button"
                onClick={() => markRead.mutate(undefined)}
                className="text-[12.5px] text-accent-600 hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.isPending ? (
              <div className="px-4">
                <Spinner label="Loading" />
              </div>
            ) : items.length ? (
              <ul className="divide-y divide-line">
                {items.map((item) => {
                  const { text, detail, to } = describeNotification(item);
                  const Icon = ICONS[item.type as keyof typeof ICONS] ?? Bell;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => open(item, to, close)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-paper ${
                          item.readAt ? '' : 'bg-accent-50/40'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                            item.readAt
                              ? 'bg-paper-dark text-ink-400'
                              : 'bg-accent-100 text-accent-700'
                          }`}
                        >
                          <Icon className="size-3.5" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] leading-snug text-ink-900">
                            {text}
                          </span>
                          {detail ? (
                            <span className="mt-0.5 block truncate text-[12.5px] text-ink-600">
                              {detail}
                            </span>
                          ) : null}
                          <span className="tabular mt-1 block font-mono text-[11px] text-ink-400">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-ink-600">
                Nothing yet. Notes, approvals and deadline reminders land here.
              </p>
            )}
          </div>
        </>
      )}
    </Popover>
  );
}
