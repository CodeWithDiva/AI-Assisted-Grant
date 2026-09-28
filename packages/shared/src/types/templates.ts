import type { EvaluationCriterion } from '../schemas/template';

export interface TemplateSection {
  id: string;
  order: number;
  title: string;
  instructions: string | null;
  wordLimit: number | null;
  charLimit: number | null;
  required: boolean;
}

export interface FunderTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  funderName: string | null;
  /** Library templates ship with the product and cannot be edited by an organization. */
  isLibrary: boolean;
  sectionCount: number;
  totalWordLimit: number | null;
  createdAt: string;
}

export interface FunderTemplateDetail extends FunderTemplateSummary {
  eligibility: string[];
  evaluationCriteria: EvaluationCriterion[];
  amountMin: number | null;
  amountMax: number | null;
  currency: string;
  sections: TemplateSection[];
}

/** What the AI reads out of an uploaded RFP, before the user reviews and saves it. */
export interface ExtractedTemplate {
  funderName: string | null;
  programName: string | null;
  description: string | null;
  amountMin: number | null;
  amountMax: number | null;
  currency: string | null;
  eligibility: string[];
  evaluationCriteria: { name: string; weight: number | null; description: string | null }[];
  deadlines: { type: string; title: string; dueDate: string | null }[];
  sections: {
    title: string;
    instructions: string | null;
    wordLimit: number | null;
    charLimit: number | null;
    required: boolean;
  }[];
}
