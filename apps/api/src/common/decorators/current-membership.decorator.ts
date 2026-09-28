import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { OrgRole } from '@grant/shared';
import type { AuthenticatedRequest } from '../types/request';

/** The membership OrgMemberGuard resolved for this request: the organization and the role. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): { organizationId: string; role: OrgRole } => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.membership!;
  },
);
