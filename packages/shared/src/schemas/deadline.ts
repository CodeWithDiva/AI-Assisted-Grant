import { z } from 'zod';
import { DeadlineType } from '../enums';

export const createDeadlineSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(DeadlineType),
  dueAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
  proposalId: z.string().trim().min(1).optional(),
  templateId: z.string().trim().min(1).optional(),
  timezone: z.string().trim().max(60).optional(),
  reminderOffsetsDays: z.array(z.number().int().min(0).max(365)).max(6).optional(),
});
export type CreateDeadlineInput = z.infer<typeof createDeadlineSchema>;

export const updateDeadlineSchema = createDeadlineSchema.partial().extend({
  completed: z.boolean().optional(),
});
export type UpdateDeadlineInput = z.infer<typeof updateDeadlineSchema>;
