import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateProposalInput,
  ProposalDetail,
  ProposalSummary,
  RefineSectionInput,
  SectionVersionView,
  UpdateProposalInput,
} from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  buildDraftUserMessage,
  buildRefineUserMessage,
  DRAFT_PROMPT_VERSION,
  DRAFT_SYSTEM_PROMPT,
  REFINE_PROMPT_VERSION,
} from './drafting.prompt';
import { countWords, ProposalContextService, readSectionText } from './proposal-context.service';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly context: ProposalContextService,
  ) {}

  /** Copies the template's sections onto the proposal so later template edits cannot disturb it. */
  async create(
    organizationId: string,
    userId: string,
    input: CreateProposalInput,
  ): Promise<ProposalDetail> {
    const template = await this.prisma.funderTemplate.findFirst({
      where: { id: input.templateId, OR: [{ organizationId }, { organizationId: null }] },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (!template.sections.length) {
      throw new BadRequestException('That template has no sections');
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        organizationId,
        templateId: template.id,
        ownerId: userId,
        title: input.title,
        requestedAmount: input.requestedAmount,
        currency: input.currency ?? template.currency,
        sections: {
          create: template.sections.map((section) => ({
            templateSectionId: section.id,
            order: section.order,
            title: section.title,
            instructions: section.instructions,
            wordLimit: section.wordLimit,
            charLimit: section.charLimit,
          })),
        },
      },
    });

    return this.findOne(organizationId, proposal.id);
  }

  async list(organizationId: string): Promise<ProposalSummary[]> {
    const proposals = await this.prisma.proposal.findMany({
      where: { organizationId },
      include: {
        template: { include: { funder: { select: { name: true } } } },
        sections: { select: { wordCount: true } },
        deadlines: {
          where: { completedAt: null },
          orderBy: { dueAt: 'asc' },
          take: 1,
          select: { dueAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return proposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      templateName: proposal.template?.name ?? null,
      funderName: proposal.template?.funder?.name ?? null,
      requestedAmount: proposal.requestedAmount ? Number(proposal.requestedAmount) : null,
      currency: proposal.currency,
      sectionCount: proposal.sections.length,
      completedSections: proposal.sections.filter((section) => section.wordCount > 0).length,
      nextDeadline: proposal.deadlines[0]?.dueAt.toISOString() ?? null,
      updatedAt: proposal.updatedAt.toISOString(),
    }));
  }

  async findOne(organizationId: string, proposalId: string): Promise<ProposalDetail> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      include: {
        template: { include: { funder: { select: { name: true } } } },
        sections: { orderBy: { order: 'asc' } },
        deadlines: {
          where: { completedAt: null },
          orderBy: { dueAt: 'asc' },
          take: 1,
          select: { dueAt: true },
        },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const sections = proposal.sections.map((section) => ({
      id: section.id,
      order: section.order,
      title: section.title,
      instructions: section.instructions,
      wordLimit: section.wordLimit,
      charLimit: section.charLimit,
      text: readSectionText(section.content),
      wordCount: section.wordCount,
      status: section.status,
      updatedAt: section.updatedAt.toISOString(),
    }));

    return {
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      templateId: proposal.templateId,
      templateName: proposal.template?.name ?? null,
      funderName: proposal.template?.funder?.name ?? null,
      requestedAmount: proposal.requestedAmount ? Number(proposal.requestedAmount) : null,
      currency: proposal.currency,
      sectionCount: sections.length,
      completedSections: sections.filter((section) => section.wordCount > 0).length,
      nextDeadline: proposal.deadlines[0]?.dueAt.toISOString() ?? null,
      updatedAt: proposal.updatedAt.toISOString(),
      sections,
    };
  }

  async update(
    organizationId: string,
    proposalId: string,
    input: UpdateProposalInput,
  ): Promise<ProposalDetail> {
    await this.requireProposal(organizationId, proposalId);
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        title: input.title,
        status: input.status,
        requestedAmount: input.requestedAmount,
        ...(input.status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
      },
    });
    return this.findOne(organizationId, proposalId);
  }

  async remove(organizationId: string, proposalId: string): Promise<void> {
    await this.requireProposal(organizationId, proposalId);
    await this.prisma.proposal.delete({ where: { id: proposalId } });
  }

  /** Manual edit from the editor. A version is kept whenever the text actually changed. */
  async saveSectionText(
    organizationId: string,
    proposalId: string,
    sectionId: string,
    text: string,
  ) {
    const section = await this.requireSection(organizationId, proposalId, sectionId);
    if (readSectionText(section.content) === text) return this.toSectionView(section, text);

    const updated = await this.prisma.proposalSection.update({
      where: { id: sectionId },
      data: {
        content: { text },
        wordCount: countWords(text),
        status: text.trim() ? 'DRAFT' : 'NOT_STARTED',
        versions: { create: { content: { text }, source: 'USER' } },
      },
    });
    await this.touchProposal(proposalId);
    return this.toSectionView(updated, text);
  }

  /** Writes a section with the AI, streaming the text out as it arrives. */
  async generateSection(
    organizationId: string,
    userId: string,
    proposalId: string,
    sectionId: string,
    instruction: string | undefined,
    onDelta: (delta: string) => void,
    onRestart?: () => void,
  ) {
    await this.requireSection(organizationId, proposalId, sectionId);
    const context = await this.context.build(organizationId, proposalId, sectionId, instruction);

    const result = await this.ai.streamText(
      {
        organizationId,
        userId,
        kind: 'SECTION_DRAFT',
        promptVersion: DRAFT_PROMPT_VERSION,
        system: [{ type: 'text', text: DRAFT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildDraftUserMessage(context) }],
        maxTokens: this.maxTokensFor(context.wordLimit),
      },
      onDelta,
      onRestart,
    );

    return this.storeGenerated(proposalId, sectionId, result.data, result.generationId);
  }

  /** Shorten, expand, change tone, or apply a custom instruction to existing text. */
  async refineSection(
    organizationId: string,
    userId: string,
    proposalId: string,
    sectionId: string,
    input: RefineSectionInput,
    onDelta: (delta: string) => void,
    onRestart?: () => void,
  ) {
    const section = await this.requireSection(organizationId, proposalId, sectionId);
    const currentText = readSectionText(section.content);
    if (!currentText.trim()) {
      throw new BadRequestException('Write or generate this section before refining it');
    }

    const context = await this.context.build(
      organizationId,
      proposalId,
      sectionId,
      input.instruction,
    );

    const result = await this.ai.streamText(
      {
        organizationId,
        userId,
        kind: 'SECTION_REFINE',
        promptVersion: REFINE_PROMPT_VERSION,
        system: [{ type: 'text', text: DRAFT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          { role: 'user', content: buildRefineUserMessage(context, input.action, currentText) },
        ],
        maxTokens: this.maxTokensFor(context.wordLimit),
      },
      onDelta,
      onRestart,
    );

    return this.storeGenerated(proposalId, sectionId, result.data, result.generationId);
  }

  async listVersions(
    organizationId: string,
    proposalId: string,
    sectionId: string,
  ): Promise<SectionVersionView[]> {
    await this.requireSection(organizationId, proposalId, sectionId);
    const versions = await this.prisma.sectionVersion.findMany({
      where: { proposalSectionId: sectionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return versions.map((version) => {
      const text = readSectionText(version.content);
      return {
        id: version.id,
        source: version.source,
        text,
        wordCount: countWords(text),
        createdAt: version.createdAt.toISOString(),
      };
    });
  }

  async restoreVersion(
    organizationId: string,
    proposalId: string,
    sectionId: string,
    versionId: string,
  ) {
    await this.requireSection(organizationId, proposalId, sectionId);
    const version = await this.prisma.sectionVersion.findFirst({
      where: { id: versionId, proposalSectionId: sectionId },
    });
    if (!version) throw new NotFoundException('Version not found');

    const text = readSectionText(version.content);
    return this.saveSectionText(organizationId, proposalId, sectionId, text);
  }

  private async storeGenerated(
    proposalId: string,
    sectionId: string,
    text: string,
    generationId: string,
  ) {
    const updated = await this.prisma.proposalSection.update({
      where: { id: sectionId },
      data: {
        content: { text },
        wordCount: countWords(text),
        status: 'DRAFT',
        versions: { create: { content: { text }, source: 'AI', aiGenerationId: generationId } },
      },
    });
    await this.touchProposal(proposalId);
    return this.toSectionView(updated, text);
  }

  private toSectionView(
    section: {
      id: string;
      order: number;
      title: string;
      instructions: string | null;
      wordLimit: number | null;
      charLimit: number | null;
      status: 'NOT_STARTED' | 'DRAFT' | 'COMPLETE';
      updatedAt: Date;
    },
    text: string,
  ) {
    return {
      id: section.id,
      order: section.order,
      title: section.title,
      instructions: section.instructions,
      wordLimit: section.wordLimit,
      charLimit: section.charLimit,
      text,
      wordCount: countWords(text),
      status: section.status,
      updatedAt: section.updatedAt.toISOString(),
    };
  }

  /** Roughly 1.6 tokens per word, plus room for thinking. */
  private maxTokensFor(wordLimit: number | null): number {
    if (!wordLimit) return 8000;
    return Math.min(16000, Math.max(2000, Math.round(wordLimit * 4) + 2000));
  }

  private async touchProposal(proposalId: string): Promise<void> {
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { updatedAt: new Date() },
    });
  }

  private async requireProposal(organizationId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      select: { id: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  private async requireSection(organizationId: string, proposalId: string, sectionId: string) {
    const section = await this.prisma.proposalSection.findFirst({
      where: { id: sectionId, proposalId, proposal: { organizationId } },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }
}
