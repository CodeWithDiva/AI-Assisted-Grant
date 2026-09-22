import type { LibraryCategory } from '../enums';

export interface LibraryBlockView {
  id: string;
  title: string;
  body: string;
  category: LibraryCategory;
  wordCount: number;
  /** How many times it has been inserted into a proposal. */
  usageCount: number;
  createdByName: string | null;
  updatedAt: string;
}

export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  ORGANIZATION: 'Organization',
  PROGRAMS: 'Programs',
  IMPACT: 'Impact and results',
  TEAM: 'Team',
  FINANCE: 'Finance and budget',
  POLICIES: 'Policies',
  OTHER: 'Other',
};
