import { z } from 'zod';
import { LibraryCategory } from '../enums';

export const createLibraryBlockSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(20_000),
  category: z.enum(LibraryCategory).default('OTHER'),
});
export type CreateLibraryBlockInput = z.infer<typeof createLibraryBlockSchema>;

export const updateLibraryBlockSchema = createLibraryBlockSchema.partial();
export type UpdateLibraryBlockInput = z.infer<typeof updateLibraryBlockSchema>;
