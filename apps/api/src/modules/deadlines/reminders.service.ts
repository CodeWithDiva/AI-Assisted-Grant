import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 60;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
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

      const when =
        daysRemaining < 0
          ? `was due ${Math.abs(daysRemaining)} day(s) ago`
          : daysRemaining === 0
            ? 'is due today'
            : `is due in ${daysRemaining} day(s)`;

      const subject = `Deadline reminder: ${deadline.title} ${when}`;
      const body = [
        `${deadline.organization.name} — ${deadline.title}`,
        deadline.proposal ? `Proposal: ${deadline.proposal.title}` : null,
        `Due: ${deadline.dueAt.toISOString().slice(0, 10)} (${deadline.timezone})`,
        '',
        'Open GrantPilot to finish and submit it.',
      ]
        .filter(Boolean)
        .join('\n');

      const delivered = await this.email.send({ to: recipients, subject, text: body });
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
