import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ComplianceIssue,
  ComplianceReport,
  CriterionScore,
  EvaluationCriterion,
  FitScoreReport,
} from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import {
  COMPLIANCE_PROMPT_VERSION,
  COMPLIANCE_SCHEMA,
  COMPLIANCE_SYSTEM_PROMPT,
  COMPLIANCE_TOOL_DESCRIPTION,
  COMPLIANCE_TOOL_NAME,
  FIT_SCORE_PROMPT_VERSION,
  FIT_SCORE_SCHEMA,
  FIT_SCORE_SYSTEM_PROMPT,
  FIT_SCORE_TOOL_DESCRIPTION,
  FIT_SCORE_TOOL_NAME,
} from './compliance.prompt';
import { runDeterministicChecks } from './compliance.rules';
import { ProposalContextService } from './proposal-context.service';
import { readSectionText } from './section-text.util';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly context: ProposalContextService,
  ) {}

  /**
   * Limits, required sections and placeholders are checked in code (fast, certain);
   * the criteria scoring is done by the AI.
   */
  async check(
    organizationId: string,
    userId: string,
    proposalId: string,
  ): Promise<ComplianceReport> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      include: {
        template: true,
        sections: { orderBy: { order: 'asc' } },
        deadlines: { where: { completedAt: null }, orderBy: { dueAt: 'asc' }, take: 1 },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const sections = proposal.sections.map((section) => ({
      ...section,
      text: readSectionText(section.content),
    }));

    const issues = runDeterministicChecks(
      sections.map((section) => ({
        id: section.id,
        title: section.title,
        text: section.text,
        wordLimit: section.wordLimit,
        charLimit: section.charLimit,
        required: true,
      })),
      proposal.deadlines.length > 0,
    );

    const criteria = (proposal.template?.evaluationCriteria as EvaluationCriterion[] | null) ?? [];
    const written = sections.filter((section) => section.text.trim());

    if (!this.ai.isConfigured) {
      return {
        issues,
        criteria: [],
        summary:
          'Limits and placeholders were checked. The AI review of the funder criteria needs an AI provider to be set up.',
        checkedAt: new Date().toISOString(),
      };
    }

    if (!written.length) {
      return {
        issues,
        criteria: [],
        summary: 'Nothing has been written yet, so the draft could not be reviewed.',
        checkedAt: new Date().toISOString(),
      };
    }

    const review = await this.ai.generateJson<{
      criteria: CriterionScore[];
      issues: { sectionTitle: string | null; severity: 'ERROR' | 'WARNING'; message: string }[];
      summary: string;
    }>({
      organizationId,
      userId,
      kind: 'COMPLIANCE_REVIEW',
      promptVersion: COMPLIANCE_PROMPT_VERSION,
      system: [
        { type: 'text', text: COMPLIANCE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            `<funder>${proposal.template?.name ?? 'Unknown programme'}</funder>`,
            criteria.length
              ? `<evaluation_criteria>\n${criteria
                  .map(
                    (criterion) =>
                      `- ${criterion.name}${criterion.weight ? ` (${criterion.weight}%)` : ''}${
                        criterion.description ? `: ${criterion.description}` : ''
                      }`,
                  )
                  .join('\n')}\n</evaluation_criteria>`
              : '<evaluation_criteria>None stated. Judge against general grant-review practice.</evaluation_criteria>',
            `<proposal title="${proposal.title}">\n${written
              .map(
                (section) =>
                  `## ${section.title}${section.wordLimit ? ` (limit ${section.wordLimit} words)` : ''}\n${section.text}`,
              )
              .join('\n\n')}\n</proposal>`,
            'Review this draft and record your scores.',
          ].join('\n\n'),
        },
      ],
      toolName: COMPLIANCE_TOOL_NAME,
      toolDescription: COMPLIANCE_TOOL_DESCRIPTION,
      schema: COMPLIANCE_SCHEMA,
      maxTokens: 8000,
    });

    const titleToId = new Map(sections.map((section) => [section.title, section.id]));
    const aiIssues: ComplianceIssue[] = review.data.issues.map((issue) => ({
      sectionId: issue.sectionTitle ? (titleToId.get(issue.sectionTitle) ?? null) : null,
      sectionTitle: issue.sectionTitle,
      severity: issue.severity,
      message: issue.message,
    }));

    return {
      issues: [...issues, ...aiIssues],
      criteria: review.data.criteria,
      summary: review.data.summary,
      checkedAt: new Date().toISOString(),
    };
  }

  /** How well this organization matches the funder's eligibility and focus. */
  async fitScore(
    organizationId: string,
    userId: string,
    proposalId: string,
  ): Promise<FitScoreReport> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      include: { template: { include: { funder: true } }, sections: { take: 1 } },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (!proposal.template) {
      throw new BadRequestException('This proposal has no funder template to compare against');
    }
    if (!proposal.sections.length) {
      throw new BadRequestException('This proposal has no sections');
    }

    const context = await this.context.build(organizationId, proposalId, proposal.sections[0].id);
    const eligibility = (proposal.template.eligibility as string[] | null) ?? [];

    const result = await this.ai.generateJson<{
      score: number;
      reasons: string[];
      gaps: string[];
    }>({
      organizationId,
      userId,
      kind: 'FIT_SCORE',
      promptVersion: FIT_SCORE_PROMPT_VERSION,
      system: [
        { type: 'text', text: FIT_SCORE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            `<organization>\nName: ${context.organizationName}\nType: ${context.organizationType}\n\n${context.profile}\n</organization>`,
            `<funder>\nFunder: ${proposal.template.funder?.name ?? 'not recorded'}\nProgramme: ${proposal.template.name}\n${
              proposal.template.description ?? ''
            }\n</funder>`,
            `<eligibility>\n${eligibility.length ? eligibility.map((item) => `- ${item}`).join('\n') : 'None stated.'}\n</eligibility>`,
            'Score the fit.',
          ].join('\n\n'),
        },
      ],
      toolName: FIT_SCORE_TOOL_NAME,
      toolDescription: FIT_SCORE_TOOL_DESCRIPTION,
      schema: FIT_SCORE_SCHEMA,
      maxTokens: 4000,
      effort: 'medium',
    });

    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { fitScore: result.data.score },
    });

    return { ...result.data, checkedAt: new Date().toISOString() };
  }
}
