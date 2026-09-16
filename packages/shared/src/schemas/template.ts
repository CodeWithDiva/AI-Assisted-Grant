import { z } from 'zod';

export const templateSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().max(4000).optional(),
  wordLimit: z.number().int().positive().max(20000).optional(),
  charLimit: z.number().int().positive().max(200000).optional(),
  required: z.boolean().default(true),
});
export type TemplateSectionInput = z.infer<typeof templateSectionSchema>;

export const evaluationCriterionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  weight: z.number().min(0).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
});
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  funderName: z.string().trim().max(200).optional(),
  sourceDocumentId: z.string().trim().min(1).optional(),
  eligibility: z.array(z.string().trim().min(1).max(600)).max(40).optional(),
  evaluationCriteria: z.array(evaluationCriterionSchema).max(25).optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  sections: z.array(templateSectionSchema).min(1).max(40),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.partial();
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const extractTemplateSchema = z.object({
  documentId: z.string().trim().min(1),
});
export type ExtractTemplateInput = z.infer<typeof extractTemplateSchema>;
