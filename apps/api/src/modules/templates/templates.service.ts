import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateTemplateInput,
  EvaluationCriterion,
  ExtractedTemplate,
  FunderTemplateDetail,
  FunderTemplateSummary,
  UpdateTemplateInput,
} from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA,
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_TOOL_DESCRIPTION,
  EXTRACTION_TOOL_NAME,
} from './extraction.prompt';

/** Guidelines longer than this are trimmed; the front of an RFP holds the structure we need. */
const MAX_RFP_CHARS = 200_000;

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly documents: DocumentsService,
  ) {}

  /** Library templates plus the organization's own. */
  async list(organizationId: string): Promise<FunderTemplateSummary[]> {
    const templates = await this.prisma.funderTemplate.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      include: {
        funder: { select: { name: true } },
        sections: { select: { wordLimit: true } },
      },
      orderBy: [{ organizationId: 'desc' }, { createdAt: 'desc' }],
    });

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      funderName: template.funder?.name ?? null,
      isLibrary: template.organizationId === null,
      sectionCount: template.sections.length,
      totalWordLimit: this.sumWordLimits(template.sections),
      createdAt: template.createdAt.toISOString(),
    }));
  }

  async findOne(organizationId: string, templateId: string): Promise<FunderTemplateDetail> {
    const template = await this.prisma.funderTemplate.findFirst({
      where: { id: templateId, OR: [{ organizationId }, { organizationId: null }] },
      include: {
        funder: { select: { name: true } },
        sections: { orderBy: { order: 'asc' } },
      },
    });
    if (!template) throw new NotFoundException('Template not found');

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      funderName: template.funder?.name ?? null,
      isLibrary: template.organizationId === null,
      sectionCount: template.sections.length,
      totalWordLimit: this.sumWordLimits(template.sections),
      createdAt: template.createdAt.toISOString(),
      eligibility: (template.eligibility as string[] | null) ?? [],
      evaluationCriteria: (template.evaluationCriteria as EvaluationCriterion[] | null) ?? [],
      amountMin: template.amountMin ? Number(template.amountMin) : null,
      amountMax: template.amountMax ? Number(template.amountMax) : null,
      currency: template.currency,
      sections: template.sections.map((section) => ({
        id: section.id,
        order: section.order,
        title: section.title,
        instructions: section.instructions,
        wordLimit: section.wordLimit,
        charLimit: section.charLimit,
        required: section.required,
      })),
    };
  }

  async create(organizationId: string, input: CreateTemplateInput): Promise<FunderTemplateDetail> {
    const funderId = await this.resolveFunder(organizationId, input.funderName);

    const template = await this.prisma.funderTemplate.create({
      data: {
        organizationId,
        funderId,
        name: input.name,
        description: input.description,
        sourceDocumentId: input.sourceDocumentId,
        eligibility: input.eligibility ?? [],
        evaluationCriteria: input.evaluationCriteria ?? [],
        amountMin: input.amountMin,
        amountMax: input.amountMax,
        currency: input.currency ?? 'USD',
        sections: {
          create: input.sections.map((section, index) => ({
            order: index + 1,
            title: section.title,
            instructions: section.instructions,
            wordLimit: section.wordLimit,
            charLimit: section.charLimit,
            required: section.required,
          })),
        },
      },
    });

    return this.findOne(organizationId, template.id);
  }

  async update(
    organizationId: string,
    templateId: string,
    input: UpdateTemplateInput,
  ): Promise<FunderTemplateDetail> {
    await this.requireOwnTemplate(organizationId, templateId);
    const funderId = await this.resolveFunder(organizationId, input.funderName);

    await this.prisma.funderTemplate.update({
      where: { id: templateId },
      data: {
        name: input.name,
        description: input.description,
        ...(funderId ? { funderId } : {}),
        ...(input.eligibility ? { eligibility: input.eligibility } : {}),
        ...(input.evaluationCriteria ? { evaluationCriteria: input.evaluationCriteria } : {}),
        amountMin: input.amountMin,
        amountMax: input.amountMax,
        currency: input.currency,
      },
    });

    // Sections are replaced wholesale — the review screen always submits the full list.
    if (input.sections) {
      await this.prisma.$transaction([
        this.prisma.templateSection.deleteMany({ where: { templateId } }),
        ...input.sections.map((section, index) =>
          this.prisma.templateSection.create({
            data: {
              templateId,
              order: index + 1,
              title: section.title,
              instructions: section.instructions,
              wordLimit: section.wordLimit,
              charLimit: section.charLimit,
              required: section.required,
            },
          }),
        ),
      ]);
    }

    return this.findOne(organizationId, templateId);
  }

  async remove(organizationId: string, templateId: string): Promise<void> {
    await this.requireOwnTemplate(organizationId, templateId);
    await this.prisma.funderTemplate.delete({ where: { id: templateId } });
  }

  /** Reads an uploaded RFP with the AI and returns a draft the user reviews before saving. */
  async extractFromDocument(
    organizationId: string,
    userId: string,
    documentId: string,
  ): Promise<ExtractedTemplate> {
    const text = await this.documents.getText(organizationId, documentId);
    if (!text.trim()) {
      throw new BadRequestException(
        'No text could be read from that document — it may be a scanned image',
      );
    }

    const result = await this.ai.generateJson<ExtractedTemplate>({
      organizationId,
      userId,
      kind: 'TEMPLATE_EXTRACTION',
      promptVersion: EXTRACTION_PROMPT_VERSION,
      system: [
        { type: 'text', text: EXTRACTION_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Funding guidelines document:\n\n<document>\n${text.slice(0, MAX_RFP_CHARS)}\n</document>`,
        },
      ],
      toolName: EXTRACTION_TOOL_NAME,
      toolDescription: EXTRACTION_TOOL_DESCRIPTION,
      schema: EXTRACTION_SCHEMA,
      maxTokens: 12000,
    });

    if (!result.data.sections?.length) {
      throw new BadRequestException(
        'No proposal sections were found in that document — check that it contains the funder guidelines',
      );
    }
    return result.data;
  }

  private async requireOwnTemplate(organizationId: string, templateId: string): Promise<void> {
    const template = await this.prisma.funderTemplate.findUnique({
      where: { id: templateId },
      select: { organizationId: true },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.organizationId !== organizationId) {
      throw new BadRequestException('Library templates cannot be changed — save a copy instead');
    }
  }

  private async resolveFunder(
    organizationId: string,
    funderName?: string,
  ): Promise<string | undefined> {
    const name = funderName?.trim();
    if (!name) return undefined;

    const existing = await this.prisma.funder.findFirst({
      where: { organizationId, name },
      select: { id: true },
    });
    if (existing) return existing.id;

    const funder = await this.prisma.funder.create({
      data: { organizationId, name, focusAreas: [], geography: [] },
      select: { id: true },
    });
    return funder.id;
  }

  private sumWordLimits(sections: { wordLimit: number | null }[]): number | null {
    const limits = sections.filter((section) => section.wordLimit);
    if (!limits.length) return null;
    return limits.reduce((total, section) => total + (section.wordLimit ?? 0), 0);
  }
}
