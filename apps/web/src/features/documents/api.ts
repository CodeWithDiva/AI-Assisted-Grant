import type { DocumentKind, OrgDocument } from '@grant/shared';
import { apiFetch, apiUpload } from '../../lib/api';

export const documentsApi = {
  list: (orgId: string) => apiFetch<OrgDocument[]>(`/orgs/${orgId}/documents`),

  upload: (orgId: string, file: File, kind: DocumentKind) => {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    return apiUpload<OrgDocument>(`/orgs/${orgId}/documents`, form);
  },

  remove: (orgId: string, documentId: string) =>
    apiFetch<void>(`/orgs/${orgId}/documents/${documentId}`, { method: 'DELETE' }),
};
