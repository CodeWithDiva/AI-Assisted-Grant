// Keep these in sync with the enums in apps/api/prisma/schema.prisma.

export const OrganizationType = {
  NONPROFIT: 'NONPROFIT',
  STARTUP: 'STARTUP',
  OTHER: 'OTHER',
} as const;
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];

export const OrgRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const DocumentKind = {
  PAST_PROPOSAL: 'PAST_PROPOSAL',
  REPORT: 'REPORT',
  RFP: 'RFP',
  OTHER: 'OTHER',
} as const;
export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

export const ProposalStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  SUBMITTED: 'SUBMITTED',
  AWARDED: 'AWARDED',
  REJECTED: 'REJECTED',
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];

export const ProcessingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;
export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

export const SectionStatus = {
  NOT_STARTED: 'NOT_STARTED',
  DRAFT: 'DRAFT',
  COMPLETE: 'COMPLETE',
} as const;
export type SectionStatus = (typeof SectionStatus)[keyof typeof SectionStatus];

export const SectionSource = {
  AI: 'AI',
  USER: 'USER',
} as const;
export type SectionSource = (typeof SectionSource)[keyof typeof SectionSource];

export const DeadlineType = {
  LOI: 'LOI',
  FULL_PROPOSAL: 'FULL_PROPOSAL',
  REPORT: 'REPORT',
  OTHER: 'OTHER',
} as const;
export type DeadlineType = (typeof DeadlineType)[keyof typeof DeadlineType];

export const ExportFormat = {
  DOCX: 'DOCX',
  PDF: 'PDF',
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];
