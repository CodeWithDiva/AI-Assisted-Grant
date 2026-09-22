import { Injectable } from '@nestjs/common';
import type { EvaluationCriterion } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { DraftContext } from './drafting.prompt';
import { readSectionText } from './section-text.util';

/** Keeps prompt size sane: a few documents, trimmed. */
const MAX_DOCUMENTS = 4;
const MAX_DOC_CHARS = 12_000;
/** Library passages are short and approved, so more of them fit: most-used first. */
const MAX_LIBRARY_CHARS = 16_000;

interface ProfileRow {
  mission: string | null;
  vision: string | null;
  programs: unknown;
  beneficiaries: string | null;
  annualBudget: unknown;
  currency: string;
  teamSummary: string | null;
  pastResults: unknown;
}

@Injectable()
export class ProposalContextService {
  constructor(private readonly prisma: PrismaService) {}

  /** Collects everything the AI is allowed to draw facts from. */
  async build(
    organizationId: string,
    proposalId: string,
    sectionId: string,
    userInstruction?: string,
  ): Promise<DraftContext> {
    const [organization, profile, documents, proposal, library] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true, type: true },
      }),
      this.prisma.orgProfile.findUnique({ where: { organizationId } }),
      this.prisma.document.findMany({
        where: {
          organizationId,
          status: 'READY',
          kind: { in: ['PAST_PROPOSAL', 'REPORT'] },
        },
        select: { fileName: true, extractedText: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_DOCUMENTS,
      }),
      this.prisma.proposal.findFirstOrThrow({
        where: { id: proposalId, organizationId },
        include: {
          template: { include: { funder: { select: { name: true } } } },
          sections: { orderBy: { order: 'asc' } },
        },
      }),
      this.prisma.libraryBlock.findMany({
        where: { organizationId },
        select: { title: true, category: true, body: true },
        orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
        take: 60,
      }),
    ]);

    const section = proposal.sections.find((item) => item.id === sectionId);
    if (!section) throw new Error('Section not found');

    return {
      organizationName: organization.name,
      organizationType: organization.type,
      profile: this.renderProfile(profile),
      library: fitWithin(library, MAX_LIBRARY_CHARS),
      documents: documents.map((document) => ({
        name: document.fileName,
        excerpt: (document.extractedText ?? '').slice(0, MAX_DOC_CHARS),
      })),
      funderName: proposal.template?.funder?.name ?? null,
      templateName: proposal.template?.name ?? null,
      eligibility: (proposal.template?.eligibility as string[] | null) ?? [],
      criteria: (proposal.template?.evaluationCriteria as EvaluationCriterion[] | null) ?? [],
      sectionTitle: section.title,
      instructions: section.instructions,
      wordLimit: section.wordLimit,
      charLimit: section.charLimit,
      writtenSections: proposal.sections
        .filter((item) => item.id !== sectionId)
        .map((item) => ({ title: item.title, text: readSectionText(item.content) }))
        .filter((item) => item.text.length > 0),
      userInstruction,
    };
  }

  private renderProfile(profile: ProfileRow | null): string {
    if (!profile) {
      return 'No organization profile has been filled in yet. Use [NEEDS INPUT: ...] placeholders for every organization fact.';
    }

    const programs = Array.isArray(profile.programs)
      ? (profile.programs as { name?: string; description?: string }[])
          .map((program) => `- ${program.name ?? 'Program'}: ${program.description ?? ''}`.trim())
          .join('\n')
      : '';

    const results = Array.isArray(profile.pastResults)
      ? (
          profile.pastResults as {
            title?: string;
            year?: number;
            metric?: string;
            value?: string;
          }[]
        )
          .map((result) =>
            `- ${result.title ?? ''} ${result.year ?? ''} ${result.metric ?? ''} ${result.value ?? ''}`.trim(),
          )
          .join('\n')
      : '';

    return [
      profile.mission ? `Mission: ${profile.mission}` : '',
      profile.vision ? `Vision: ${profile.vision}` : '',
      profile.beneficiaries ? `Who they serve: ${profile.beneficiaries}` : '',
      profile.teamSummary ? `Team: ${profile.teamSummary}` : '',
      profile.annualBudget
        ? `Annual budget: ${String(profile.annualBudget)} ${profile.currency}`
        : '',
      programs ? `Programs:\n${programs}` : '',
      results ? `Past results:\n${results}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
}

export { countWords, readSectionText } from './section-text.util';

/** Keeps whole passages, in order, until the character budget is used up. */
export function fitWithin<T extends { body: string }>(items: T[], budget: number): T[] {
  const kept: T[] = [];
  let used = 0;
  for (const item of items) {
    if (used + item.body.length > budget) break;
    kept.push(item);
    used += item.body.length;
  }
  return kept;
}
