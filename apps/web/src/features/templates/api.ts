import type {
  CreateTemplateInput,
  ExtractedTemplate,
  FunderTemplateDetail,
  FunderTemplateSummary,
  UpdateTemplateInput,
} from '@grant/shared';
import { apiFetch } from '../../lib/api';

export const templatesApi = {
  list: (orgId: string) => apiFetch<FunderTemplateSummary[]>(`/orgs/${orgId}/templates`),

  get: (orgId: string, templateId: string) =>
    apiFetch<FunderTemplateDetail>(`/orgs/${orgId}/templates/${templateId}`),

  extract: (orgId: string, documentId: string) =>
    apiFetch<ExtractedTemplate>(`/orgs/${orgId}/templates/extract`, {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),

  create: (orgId: string, body: CreateTemplateInput) =>
    apiFetch<FunderTemplateDetail>(`/orgs/${orgId}/templates`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (orgId: string, templateId: string, body: UpdateTemplateInput) =>
    apiFetch<FunderTemplateDetail>(`/orgs/${orgId}/templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (orgId: string, templateId: string) =>
    apiFetch<void>(`/orgs/${orgId}/templates/${templateId}`, { method: 'DELETE' }),
};
