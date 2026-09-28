import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';
import type { AuthenticatedRequest } from '../../common/types/request';
import { actionFor, detailsOf } from './audit.actions';
import { AuditService } from './audit.service';

/**
 * Writes the organization's activity trail. One place records every change, so a new
 * endpoint is logged by adding a line to audit.actions.ts rather than touching its service.
 * Only successful, org-scoped requests are recorded.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const action = actionFor(context.getClass().name, context.getHandler().name);
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((response) => {
        const organizationId = request.membership?.organizationId ?? request.params?.orgId;
        if (!organizationId || typeof organizationId !== 'string' || !request.user) return;

        const { entityId, metadata } = detailsOf(response, request.params ?? {});
        // Deliberately not awaited: the response should not wait for the trail.
        void this.audit.record({
          organizationId,
          userId: request.user.id,
          action,
          entity: action.split('.')[0],
          entityId,
          metadata,
        });
      }),
    );
  }
}
