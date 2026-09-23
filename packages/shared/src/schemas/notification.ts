import { z } from 'zod';

export const markNotificationsReadSchema = z.object({
  /** Left out to mark everything read. */
  ids: z.array(z.string().trim().min(1)).max(100).optional(),
});
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
