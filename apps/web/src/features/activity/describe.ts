import type { ActivityEntry, ProposalStatus } from '@grant/shared';
import { statusLabels } from '../proposals/status';

/** Turns one recorded action into the sentence a reader sees, with what it touched. */
export function describeActivity(entry: ActivityEntry): {
  text: string;
  subject: string | null;
  after?: string;
} {
  const { title, name, fileName, email, role, format, status } = entry.metadata;
  const named = title ?? name ?? fileName ?? null;
  const statusLabel = status ? (statusLabels[status as ProposalStatus] ?? status) : null;

  switch (entry.action) {
    case 'proposal.created':
      return { text: 'started the proposal', subject: named };
    case 'proposal.updated':
      return statusLabel
        ? { text: 'moved', subject: named, after: `to ${statusLabel}` }
        : { text: 'updated the proposal', subject: named };
    case 'proposal.deleted':
      return { text: 'deleted a proposal', subject: null };
    case 'section.saved':
      return { text: 'edited the section', subject: named };
    case 'section.drafted':
      return { text: 'drafted with the AI', subject: named };
    case 'section.refined':
      return { text: 'rewrote with the AI', subject: named };
    case 'section.restored':
      return { text: 'restored an earlier version of', subject: named };
    case 'template.imported':
      return { text: 'read a funder template out of an RFP', subject: named };
    case 'template.created':
      return { text: 'saved the funder template', subject: named };
    case 'template.updated':
      return { text: 'updated the funder template', subject: named };
    case 'template.deleted':
      return { text: 'deleted a funder template', subject: null };
    case 'document.uploaded':
      return { text: 'uploaded', subject: named };
    case 'document.deleted':
      return { text: 'deleted a document', subject: null };
    case 'library.created':
      return { text: 'added to the content library', subject: named };
    case 'library.updated':
      return { text: 'edited the library passage', subject: named };
    case 'library.deleted':
      return { text: 'deleted a library passage', subject: null };
    case 'deadline.created':
      return { text: 'added the deadline', subject: named };
    case 'deadline.updated':
      return { text: 'updated a deadline', subject: named };
    case 'deadline.deleted':
      return { text: 'deleted a deadline', subject: null };
    case 'export.created':
      return { text: `exported a proposal${format ? ` as ${format}` : ''}`, subject: null };
    case 'profile.updated':
      return { text: 'updated the organization profile', subject: null };
    case 'organization.updated':
      return { text: 'updated the organization details', subject: named };
    case 'member.invited':
      return { text: `invited${role ? ` a ${role.toLowerCase()}` : ''}`, subject: email ?? null };
    case 'invitation.revoked':
      return { text: 'revoked an invitation', subject: null };
    case 'member.joined':
      return { text: 'joined the organization', subject: null };
    case 'member.role_changed':
      return {
        text: `changed a member's role${role ? ` to ${role.toLowerCase()}` : ''}`,
        subject: null,
      };
    case 'member.removed':
      return { text: 'removed a member', subject: null };
    default:
      return { text: entry.action.replace(/[._]/g, ' '), subject: named };
  }
}

/** "Today", "Yesterday", then the date — the heading each group of entries sits under. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const start = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 864e5;
  const days = start(new Date()) - start(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
}
