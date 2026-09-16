import { z } from 'zod';
import { OrganizationType, OrgRole } from '../enums';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum(OrganizationType),
  country: z.string().trim().max(100).optional(),
  website: z.url().optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = createOrganizationSchema.partial();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const inviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(OrgRole),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(OrgRole),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
