import type { ProposalStatus } from '@grant/shared';

export const statusLabels: Record<ProposalStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  SUBMITTED: 'Submitted',
  AWARDED: 'Awarded',
  REJECTED: 'Rejected',
};

export const statusTones: Record<ProposalStatus, 'neutral' | 'amber' | 'blue' | 'green' | 'red'> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'amber',
  SUBMITTED: 'blue',
  AWARDED: 'green',
  REJECTED: 'red',
};
