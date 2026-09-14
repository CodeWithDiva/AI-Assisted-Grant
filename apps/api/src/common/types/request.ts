import type { AuthUser, OrgRole } from '@grant/shared';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  membership?: { organizationId: string; role: OrgRole };
}
