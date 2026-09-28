import type { OrgRole } from '../enums';

export interface MemberView {
  id: string;
  role: OrgRole;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface InvitationView {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

/** Returned once, when an invitation is created — the link is not stored in plain text. */
export interface CreatedInvitation extends InvitationView {
  token: string;
  link: string;
  emailed: boolean;
}

/** What an invitee sees before accepting. */
export interface InvitationPreview {
  organizationName: string;
  invitedBy: string;
  email: string;
  role: OrgRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
}

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  OWNER: 'Everything, including inviting, re-assigning and removing members',
  EDITOR: 'Write proposals, upload documents, manage templates and deadlines',
  VIEWER: 'Read everything, change nothing',
};
