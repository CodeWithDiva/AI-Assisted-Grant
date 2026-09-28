import { Injectable, Logger } from '@nestjs/common';
import type { NotificationView } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';

const PAGE_SIZE = 30;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tells people something happened. Never throws and never notifies the person who did it:
   * an action must not fail because a notification could not be written.
   */
  async notify(
    userIds: string[],
    type: string,
    payload: Record<string, string | number | null>,
    exceptUserId?: string,
  ): Promise<void> {
    const recipients = [...new Set(userIds)].filter((id) => id && id !== exceptUserId);
    if (!recipients.length) return;

    try {
      await this.prisma.notification.createMany({
        data: recipients.map((userId) => ({ userId, type, payload })),
      });
    } catch (error) {
      this.logger.warn(`Could not send "${type}": ${(error as Error).message}`);
    }
  }

  /** Everyone who should hear about work on a proposal: its owner and the organization's owners. */
  async watchersOf(organizationId: string, proposalId: string): Promise<string[]> {
    const [proposal, owners, commenters] = await Promise.all([
      this.prisma.proposal.findUnique({ where: { id: proposalId }, select: { ownerId: true } }),
      this.prisma.membership.findMany({
        where: { organizationId, role: 'OWNER' },
        select: { userId: true },
      }),
      this.prisma.proposalComment.findMany({
        where: { proposalId },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
    ]);

    return [
      ...(proposal?.ownerId ? [proposal.ownerId] : []),
      ...owners.map((member) => member.userId),
      ...commenters.map((comment) => comment.authorId).filter((id): id is string => Boolean(id)),
    ];
  }

  async list(userId: string): Promise<NotificationView[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    });

    return notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      payload: (notification.payload ?? {}) as Record<string, string | number | null>,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }));
  }

  async markRead(userId: string, ids?: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
  }
}
