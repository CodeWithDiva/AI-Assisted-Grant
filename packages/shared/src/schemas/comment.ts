import { z } from 'zod';

export const createCommentSchema = z.object({
  /** Left out for a note about the proposal as a whole. */
  sectionId: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).max(4000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const resolveCommentSchema = z.object({
  resolved: z.boolean(),
});
export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>;
