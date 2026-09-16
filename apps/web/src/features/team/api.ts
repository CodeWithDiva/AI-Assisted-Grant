import type {
  CreatedInvitation,
  InvitationPreview,
  InvitationView,
  InviteMemberInput,
  MemberView,
  OrgRole,
} from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const teamApi = {
  members: (orgId: string) => apiFetch<MemberView[]>(`/orgs/${orgId}/members`),

  updateRole: (orgId: string, membershipId: string, role: OrgRole) =>
    apiFetch<MemberView>(`/orgs/${orgId}/members/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (orgId: string, membershipId: string) =>
    apiFetch<void>(`/orgs/${orgId}/members/${membershipId}`, { method: 'DELETE' }),

  invitations: (orgId: string) => apiFetch<InvitationView[]>(`/orgs/${orgId}/invitations`),

  invite: (orgId: string, body: InviteMemberInput) =>
    apiFetch<CreatedInvitation>(`/orgs/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  revoke: (orgId: string, invitationId: string) =>
    apiFetch<void>(`/orgs/${orgId}/invitations/${invitationId}`, { method: 'DELETE' }),

  preview: (token: string) => apiFetch<InvitationPreview>(`/invitations/${token}`),

  accept: (token: string) =>
    apiFetch<{ id: string; name: string }>(`/invitations/${token}/accept`, { method: 'POST' }),
};
