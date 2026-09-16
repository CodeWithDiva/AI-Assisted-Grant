import type { ProposalStatus, SectionSource, SectionStatus } from '../enums';

export interface ProposalSectionView {
  id: string;
  order: number;
  title: string;
  instructions: string | null;
  wordLimit: number | null;
  charLimit: number | null;
  text: string;
  wordCount: number;
  status: SectionStatus;
  updatedAt: string;
}

export interface ProposalSummary {
  id: string;
  title: string;
  status: ProposalStatus;
  templateName: string | null;
  funderName: string | null;
  requestedAmount: number | null;
  currency: string;
  sectionCount: number;
  completedSections: number;
  nextDeadline: string | null;
  updatedAt: string;
}

export interface ProposalDetail extends ProposalSummary {
  templateId: string | null;
  sections: ProposalSectionView[];
}

export interface SectionVersionView {
  id: string;
  source: SectionSource;
  text: string;
  wordCount: number;
  createdAt: string;
}

/** One issue found by the compliance check. */
export interface ComplianceIssue {
  sectionId: string | null;
  sectionTitle: string | null;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface CriterionScore {
  name: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface ComplianceReport {
  issues: ComplianceIssue[];
  criteria: CriterionScore[];
  summary: string;
  checkedAt: string;
}

export interface FitScoreReport {
  score: number;
  reasons: string[];
  gaps: string[];
  checkedAt: string;
}
