import { z } from 'zod';
import { ProposalStatus } from '../enums';

export const createProposalSchema = z.object({
  templateId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  requestedAmount: z.number().nonnegative().optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  status: z.enum(ProposalStatus).optional(),
  requestedAmount: z.number().nonnegative().optional(),
});
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

export const updateSectionSchema = z.object({
  text: z.string().max(100_000),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const generateSectionSchema = z.object({
  instruction: z.string().trim().max(1000).optional(),
});
export type GenerateSectionInput = z.infer<typeof generateSectionSchema>;

export const RefineAction = {
  SHORTEN: 'SHORTEN',
  EXPAND: 'EXPAND',
  TONE_FORMAL: 'TONE_FORMAL',
  TONE_PLAIN: 'TONE_PLAIN',
  CUSTOM: 'CUSTOM',
} as const;
export type RefineAction = (typeof RefineAction)[keyof typeof RefineAction];

export const refineSectionSchema = z.object({
  action: z.enum(RefineAction),
  instruction: z.string().trim().max(1000).optional(),
});
export type RefineSectionInput = z.infer<typeof refineSectionSchema>;
