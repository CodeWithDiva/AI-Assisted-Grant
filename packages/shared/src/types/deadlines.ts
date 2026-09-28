import type { DeadlineType } from '../enums';

export interface DeadlineView {
  id: string;
  title: string;
  type: DeadlineType;
  dueAt: string;
  timezone: string;
  reminderOffsetsDays: number[];
  completedAt: string | null;
  proposalId: string | null;
  proposalTitle: string | null;
  templateId: string | null;
  templateName: string | null;
  /** Negative when the date has passed. */
  daysRemaining: number;
}

export const DEADLINE_TYPE_LABELS: Record<DeadlineType, string> = {
  LOI: 'Letter of inquiry',
  FULL_PROPOSAL: 'Full proposal',
  REPORT: 'Report',
  OTHER: 'Other',
};
