import type { OrgProfileInput } from '@grant/shared';
import { apiFetch } from '../../lib/api';

export interface OrgProfileResponse extends OrgProfileInput {
  organizationId: string;
  updatedAt: string;
}

export const profileApi = {
  get: (orgId: string) => apiFetch<OrgProfileResponse | null>(`/orgs/${orgId}/profile`),
  update: (orgId: string, body: OrgProfileInput) =>
    apiFetch<OrgProfileResponse>(`/orgs/${orgId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
