import {
  BadRequestException,
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrgRole } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/request';

/** Confirms the signed-in user belongs to the organization in the URL, and checks @Roles. */
@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const param = request.params.orgId;
    const organizationId = Array.isArray(param) ? param[0] : param;
    if (!organizationId) throw new BadRequestException('Organization id is missing');

    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: request.user.id, organizationId } },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this organization');

    const allowedRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowedRoles?.length && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Your role does not allow this action');
    }

    request.membership = { organizationId, role: membership.role };
    return true;
  }
}
