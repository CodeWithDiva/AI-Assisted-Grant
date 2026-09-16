import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateDeadlineInput, DeadlineView, UpdateDeadlineInput } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { buildIcs } from './ics.util';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DeadlinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, scope: 'all' | 'open' = 'all'): Promise<DeadlineView[]> {
    const deadlines = await this.prisma.deadline.findMany({
      where: { organizationId, ...(scope === 'open' ? { completedAt: null } : {}) },
      include: {
        proposal: { select: { id: true, title: true } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return deadlines.map((deadline) => this.toView(deadline));
  }

  async create(organizationId: string, input: CreateDeadlineInput): Promise<DeadlineView> {
    await this.assertLinksBelongToOrg(organizationId, input.proposalId, input.templateId);

    const deadline = await this.prisma.deadline.create({
      data: {
        organizationId,
        proposalId: input.proposalId,
        templateId: input.templateId,
        title: input.title,
        type: input.type,
        dueAt: new Date(input.dueAt),
        timezone: input.timezone ?? 'UTC',
        ...(input.reminderOffsetsDays ? { reminderOffsetsDays: input.reminderOffsetsDays } : {}),
      },
      include: {
        proposal: { select: { id: true, title: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return this.toView(deadline);
  }

  async update(
    organizationId: string,
    deadlineId: string,
    input: UpdateDeadlineInput,
  ): Promise<DeadlineView> {
    await this.require(organizationId, deadlineId);
    await this.assertLinksBelongToOrg(organizationId, input.proposalId, input.templateId);

    const deadline = await this.prisma.deadline.update({
      where: { id: deadlineId },
      data: {
        title: input.title,
        type: input.type,
        ...(input.dueAt ? { dueAt: new Date(input.dueAt) } : {}),
        timezone: input.timezone,
        proposalId: input.proposalId,
        templateId: input.templateId,
        ...(input.reminderOffsetsDays ? { reminderOffsetsDays: input.reminderOffsetsDays } : {}),
        ...(input.completed === undefined
          ? {}
          : { completedAt: input.completed ? new Date() : null }),
      },
      include: {
        proposal: { select: { id: true, title: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return this.toView(deadline);
  }

  async remove(organizationId: string, deadlineId: string): Promise<void> {
    await this.require(organizationId, deadlineId);
    await this.prisma.deadline.delete({ where: { id: deadlineId } });
  }

  /** A calendar file the user can open in Google Calendar, Outlook or Apple Calendar. */
  async toIcs(organizationId: string, deadlineId: string): Promise<string> {
    const deadline = await this.require(organizationId, deadlineId);
    return buildIcs({
      id: deadline.id,
      title: deadline.title,
      description: `Grant deadline tracked in GrantPilot (${deadline.type}).`,
      start: deadline.dueAt,
    });
  }

  private async require(organizationId: string, deadlineId: string) {
    const deadline = await this.prisma.deadline.findFirst({
      where: { id: deadlineId, organizationId },
    });
    if (!deadline) throw new NotFoundException('Deadline not found');
    return deadline;
  }

  private async assertLinksBelongToOrg(
    organizationId: string,
    proposalId?: string,
    templateId?: string,
  ): Promise<void> {
    if (proposalId) {
      const proposal = await this.prisma.proposal.findFirst({
        where: { id: proposalId, organizationId },
        select: { id: true },
      });
      if (!proposal) throw new BadRequestException('That proposal does not exist');
    }
    if (templateId) {
      const template = await this.prisma.funderTemplate.findFirst({
        where: { id: templateId, OR: [{ organizationId }, { organizationId: null }] },
        select: { id: true },
      });
      if (!template) throw new BadRequestException('That template does not exist');
    }
  }

  private toView(deadline: {
    id: string;
    title: string;
    type: DeadlineView['type'];
    dueAt: Date;
    timezone: string;
    reminderOffsetsDays: number[];
    completedAt: Date | null;
    proposal?: { id: string; title: string } | null;
    template?: { id: string; name: string } | null;
  }): DeadlineView {
    return {
      id: deadline.id,
      title: deadline.title,
      type: deadline.type,
      dueAt: deadline.dueAt.toISOString(),
      timezone: deadline.timezone,
      reminderOffsetsDays: deadline.reminderOffsetsDays,
      completedAt: deadline.completedAt?.toISOString() ?? null,
      proposalId: deadline.proposal?.id ?? null,
      proposalTitle: deadline.proposal?.title ?? null,
      templateId: deadline.template?.id ?? null,
      templateName: deadline.template?.name ?? null,
      daysRemaining: Math.ceil((deadline.dueAt.getTime() - Date.now()) / DAY_MS),
    };
  }
}
