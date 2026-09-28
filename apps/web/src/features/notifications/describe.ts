import type { NotificationView } from '@grant/shared';

/** The line shown in the bell menu, and where the notification leads. */
export function describeNotification(notification: NotificationView): {
  text: string;
  detail: string | null;
  to: string | null;
} {
  const payload = notification.payload;
  const text = (key: string) =>
    typeof payload[key] === 'string' ? (payload[key] as string) : null;
  const proposalId = text('proposalId');
  const proposalLink = proposalId ? `/proposals/${proposalId}` : null;

  switch (notification.type) {
    case 'COMMENT_ADDED':
      return {
        text: `${text('authorName') ?? 'Someone'} left a review note on ${text('proposalTitle') ?? 'a proposal'}`,
        detail: text('sectionTitle')
          ? `${text('sectionTitle')} — ${text('excerpt') ?? ''}`
          : text('excerpt'),
        to: proposalLink,
      };
    case 'PROPOSAL_ASSIGNED':
      return {
        text: `${text('proposalTitle') ?? 'A proposal'} was assigned to you`,
        detail: null,
        to: proposalLink,
      };
    case 'PROPOSAL_APPROVED':
      return {
        text: `${text('byName') ?? 'An owner'} approved ${text('proposalTitle') ?? 'a proposal'} for submission`,
        detail: null,
        to: proposalLink,
      };
    case 'PROPOSAL_APPROVAL_WITHDRAWN':
      return {
        text: `The approval of ${text('proposalTitle') ?? 'a proposal'} was withdrawn`,
        detail: null,
        to: proposalLink,
      };
    case 'MEMBER_JOINED':
      return {
        text: `${text('memberName') ?? 'Someone'} joined ${text('organizationName') ?? 'the organization'}`,
        detail: text('role') ? `as ${text('role')!.toLowerCase()}` : null,
        to: '/team',
      };
    case 'DEADLINE_REMINDER': {
      const days = Number(payload.daysRemaining ?? 0);
      const when =
        days < 0
          ? `${Math.abs(days)} days overdue`
          : days === 0
            ? 'due today'
            : `due in ${days} days`;
      return {
        text: `${text('title') ?? 'A deadline'} is ${when}`,
        detail: null,
        to: '/deadlines',
      };
    }
    default:
      return { text: notification.type.replace(/_/g, ' ').toLowerCase(), detail: null, to: null };
  }
}
