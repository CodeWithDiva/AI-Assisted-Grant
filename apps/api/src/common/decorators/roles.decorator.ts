import { SetMetadata } from '@nestjs/common';
import type { OrgRole } from '@grant/shared';

export const ROLES_KEY = 'orgRoles';

/** Restricts a route to the given roles within the organization in the URL. */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
