import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/request';

/** Guards the internal admin endpoints: the user's platformRole must be ADMIN. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { platformRole: true },
    });
    if (user?.platformRole !== 'ADMIN') {
      throw new ForbiddenException('Administrator access only');
    }
    return true;
  }
}
