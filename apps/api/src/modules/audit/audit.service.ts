import { Injectable, Logger } from '@nestjs/common';
import type { ActivityEntry } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { COLLAPSED_ACTIONS } from './audit.actions';

/** How long repeated saves of the same section fold into one entry. */
const COLLAPSE_WINDOW_MINUTES = 10;
const PAGE_SIZE = 40;

export interface AuditEntryInput {
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, string>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws: an action must not fail because its trail entry could not be written. */
  async record(entry: AuditEntryInput): Promise<void> {
    try {
      if (COLLAPSED_ACTIONS.has(entry.action) && entry.entityId) {
        const since = new Date(Date.now() - COLLAPSE_WINDOW_MINUTES * 60 * 1000);
        const recent = await this.prisma.auditLog.findFirst({
          where: {
            organizationId: entry.organizationId,
            userId: entry.userId,
            action: entry.action,
            entityId: entry.entityId,
            createdAt: { gt: since },
          },
          select: { id: true },
        });
        if (recent) {
          await this.prisma.auditLog.update({
            where: { id: recent.id },
            data: { createdAt: new Date(), metadata: entry.metadata },
          });
          return;
        }
      }

      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Could not record "${entry.action}": ${(error as Error).message}`);
    }
  }

  /** Newest first. `before` is the timestamp of the oldest entry already shown. */
  async list(organizationId: string, before?: string): Promise<ActivityEntry[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    });

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      metadata: (entry.metadata ?? {}) as Record<string, string>,
      userName: entry.user?.name ?? null,
      at: entry.createdAt.toISOString(),
    }));
  }
}
