import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { deadlineReminderEmail } from '../email/email-templates';
import { EmailService } from '../email/email.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 60;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Runs every morning; each reminder is recorded so it is never sent twice. */
  @Cron('0 8 * * *')
  async runDaily(): Promise<void> {
    const sent = await this.run();
    if (sent) this.logger.log(`Sent ${sent} deadline reminder(s)`);
  }

  async run(organizationId?: string): Promise<number> {
    const now = new Date();
    const horizon = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);

    const deadlines = await this.prisma.deadline.findMany({
      where: {
        completedAt: null,
        dueAt: { lte: horizon },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        reminders: { select: { offsetDays: true } },
        proposal: { select: { title: true } },
        organization: {
          select: {
            name: true,
            memberships: {
              where: { role: { in: ['OWNER', 'EDITOR'] } },
              select: { userId: true, user: { select: { email: true } } },
            },
          },
        },
      },
    });

    let sentCount = 0;

    for (const deadline of deadlines) {
      const daysRemaining = Math.ceil((deadline.dueAt.getTime() - now.getTime()) / DAY_MS);
      const alreadySent = new Set(deadline.reminders.map((reminder) => reminder.offsetDays));
      const due = deadline.reminderOffsetsDays
        .filter((offset) => daysRemaining <= offset && !alreadySent.has(offset))
        .sort((a, b) => b - a);

      if (!due.length) continue;

      const recipients = deadline.organization.memberships
        .map((membership) => membership.user.email)
        .filter(Boolean);

      const message = deadlineReminderEmail({
        organizationName: deadline.organization.name,
        deadlineTitle: deadline.title,
        proposalTitle: deadline.proposal?.title ?? null,
        dueAt: deadline.dueAt,
        timezone: deadline.timezone,
        daysRemaining,
        appUrl: this.config.get('WEB_ORIGIN', { infer: true }),
      });

      const delivered = await this.email.send({ to: recipients, ...message });
      if (!delivered) continue;

      await this.prisma.$transaction([
        ...due.map((offset) =>
          this.prisma.deadlineReminder.create({
            data: { deadlineId: deadline.id, offsetDays: offset },
          }),
        ),
        ...deadline.organization.memberships.map((membership) =>
          this.prisma.notification.create({
            data: {
              userId: membership.userId,
              type: 'DEADLINE_REMINDER',
              payload: {
                deadlineId: deadline.id,
                title: deadline.title,
                dueAt: deadline.dueAt.toISOString(),
                daysRemaining,
              },
            },
          }),
        ),
      ]);

      sentCount += 1;
    }

    return sentCount;
  }
}
