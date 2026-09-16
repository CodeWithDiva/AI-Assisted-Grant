import type {
  CreateOrganizationInput,
  InviteMemberInput,
  OrgRole,
  UpdateOrganizationInput,
} from '@grant/shared';
import { apiFetch } from '../../lib/api';

export interface Organization {
  id: string;
  name: string;
  type: string;
  country: string | null;
  website: string | null;
  role?: OrgRole;
}

export interface OrganizationMember {
  id: string;
  role: OrgRole;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
  token: string;
}

export const organizationsApi = {
  list: () => apiFetch<Organization[]>('/orgs'),
  get: (orgId: string) => apiFetch<Organization>(`/orgs/${orgId}`),
  create: (body: CreateOrganizationInput) =>
    apiFetch<Organization>('/orgs', { method: 'POST', body: JSON.stringify(body) }),
  update: (orgId: string, body: UpdateOrganizationInput) =>
    apiFetch<Organization>(`/orgs/${orgId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  members: (orgId: string) => apiFetch<OrganizationMember[]>(`/orgs/${orgId}/members`),
  invite: (orgId: string, body: InviteMemberInput) =>
    apiFetch<Invitation>(`/orgs/${orgId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
