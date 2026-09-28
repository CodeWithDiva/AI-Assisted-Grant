import type {
  CreateCommentInput,
  ProposalCommentView,
  ComplianceReport,
  ExportFormat,
  CreateProposalInput,
  FitScoreReport,
  ProposalDetail,
  ProposalSectionView,
  ProposalSummary,
  RefineSectionInput,
  SectionVersionView,
  UpdateProposalInput,
} from '@grant/shared';
import { apiFetch, apiStream } from '../../lib/api';

export const proposalsApi = {
  comments: (orgId: string, proposalId: string) =>
    apiFetch<ProposalCommentView[]>(`/orgs/${orgId}/proposals/${proposalId}/comments`),

  addComment: (orgId: string, proposalId: string, body: CreateCommentInput) =>
    apiFetch<ProposalCommentView>(`/orgs/${orgId}/proposals/${proposalId}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resolveComment: (orgId: string, proposalId: string, commentId: string, resolved: boolean) =>
    apiFetch<ProposalCommentView>(`/orgs/${orgId}/proposals/${proposalId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved }),
    }),

  deleteComment: (orgId: string, proposalId: string, commentId: string) =>
    apiFetch<void>(`/orgs/${orgId}/proposals/${proposalId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  /** Owners only: sign a proposal off for submission, or take the approval back. */
  setApproval: (orgId: string, proposalId: string, approved: boolean) =>
    apiFetch<ProposalDetail>(`/orgs/${orgId}/proposals/${proposalId}/approval`, {
      method: approved ? 'POST' : 'DELETE',
    }),

  list: (orgId: string) => apiFetch<ProposalSummary[]>(`/orgs/${orgId}/proposals`),

  get: (orgId: string, proposalId: string) =>
    apiFetch<ProposalDetail>(`/orgs/${orgId}/proposals/${proposalId}`),

  create: (orgId: string, body: CreateProposalInput) =>
    apiFetch<ProposalDetail>(`/orgs/${orgId}/proposals`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (orgId: string, proposalId: string, body: UpdateProposalInput) =>
    apiFetch<ProposalDetail>(`/orgs/${orgId}/proposals/${proposalId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (orgId: string, proposalId: string) =>
    apiFetch<void>(`/orgs/${orgId}/proposals/${proposalId}`, { method: 'DELETE' }),

  saveSection: (orgId: string, proposalId: string, sectionId: string, text: string) =>
    apiFetch<ProposalSectionView>(`/orgs/${orgId}/proposals/${proposalId}/sections/${sectionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    }),

  generateSection: (
    orgId: string,
    proposalId: string,
    sectionId: string,
    instruction: string | undefined,
    onDelta: (text: string) => void,
    onRestart?: () => void,
  ) =>
    apiStream<ProposalSectionView>(
      `/orgs/${orgId}/proposals/${proposalId}/sections/${sectionId}/generate`,
      { instruction },
      onDelta,
      onRestart,
    ),

  refineSection: (
    orgId: string,
    proposalId: string,
    sectionId: string,
    body: RefineSectionInput,
    onDelta: (text: string) => void,
    onRestart?: () => void,
  ) =>
    apiStream<ProposalSectionView>(
      `/orgs/${orgId}/proposals/${proposalId}/sections/${sectionId}/refine`,
      body,
      onDelta,
      onRestart,
    ),

  compliance: (orgId: string, proposalId: string) =>
    apiFetch<ComplianceReport>(`/orgs/${orgId}/proposals/${proposalId}/compliance`, {
      method: 'POST',
    }),

  fitScore: (orgId: string, proposalId: string) =>
    apiFetch<FitScoreReport>(`/orgs/${orgId}/proposals/${proposalId}/fit-score`, {
      method: 'POST',
    }),

  createExport: (orgId: string, proposalId: string, format: ExportFormat) =>
    apiFetch<{ id: string; format: ExportFormat; status: string; fileName: string }>(
      `/orgs/${orgId}/proposals/${proposalId}/exports`,
      { method: 'POST', body: JSON.stringify({ format }) },
    ),

  listExports: (orgId: string, proposalId: string) =>
    apiFetch<
      { id: string; format: ExportFormat; status: string; fileName: string; createdAt: string }[]
    >(`/orgs/${orgId}/proposals/${proposalId}/exports`),

  versions: (orgId: string, proposalId: string, sectionId: string) =>
    apiFetch<SectionVersionView[]>(
      `/orgs/${orgId}/proposals/${proposalId}/sections/${sectionId}/versions`,
    ),

  restoreVersion: (orgId: string, proposalId: string, sectionId: string, versionId: string) =>
    apiFetch<ProposalSectionView>(
      `/orgs/${orgId}/proposals/${proposalId}/sections/${sectionId}/versions/${versionId}/restore`,
      { method: 'POST' },
    ),
};
