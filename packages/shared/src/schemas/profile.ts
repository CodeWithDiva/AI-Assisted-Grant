import { z } from 'zod';

export const programSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  beneficiaries: z.string().trim().max(500).optional(),
  outcomes: z.string().trim().max(1000).optional(),
});
export type Program = z.infer<typeof programSchema>;

export const pastResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  year: z.number().int().min(1900).max(2100).optional(),
  metric: z.string().trim().max(200).optional(),
  value: z.string().trim().max(200).optional(),
});
export type PastResult = z.infer<typeof pastResultSchema>;

/** The organization facts the AI drafts proposals from. Every field is optional so it can be filled in over time. */
export const orgProfileSchema = z.object({
  mission: z.string().trim().max(5000).optional(),
  vision: z.string().trim().max(5000).optional(),
  programs: z.array(programSchema).max(20).optional(),
  beneficiaries: z.string().trim().max(2000).optional(),
  annualBudget: z.number().nonnegative().max(1_000_000_000_000).optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  teamSummary: z.string().trim().max(3000).optional(),
  pastResults: z.array(pastResultSchema).max(20).optional(),
});
export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

export interface OrgProfile extends OrgProfileInput {
  organizationId: string;
  updatedAt: string;
}
