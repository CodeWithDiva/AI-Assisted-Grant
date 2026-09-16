import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ExportFormat } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { readSectionText } from '../proposals/proposal-context.service';
import { StorageService } from '../storage/storage.service';
import { DocumentBuilderService } from './document-builder.service';

export interface ExportView {
  id: string;
  format: ExportFormat;
  status: string;
  fileName: string;
  createdAt: string;
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly builder: DocumentBuilderService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    proposalId: string,
    format: ExportFormat,
  ): Promise<ExportView> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      include: {
        organization: { select: { name: true } },
        template: { include: { funder: { select: { name: true } } } },
        sections: { orderBy: { order: 'asc' } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const record = await this.prisma.export.create({
      data: { proposalId, createdById: userId, format, status: 'PROCESSING' },
    });

    try {
      const payload = {
        title: proposal.title,
        organizationName: proposal.organization.name,
        funderName: proposal.template?.funder?.name ?? proposal.template?.name ?? null,
        sections: proposal.sections.map((section) => ({
          title: section.title,
          text: readSectionText(section.content),
          wordLimit: section.wordLimit,
        })),
      };

      const contents =
        format === 'DOCX' ? await this.builder.toDocx(payload) : await this.builder.toPdf(payload);
      const fileName = `${slugify(proposal.title)}.${format.toLowerCase()}`;
      const fileKey = await this.storage.save(organizationId, fileName, contents);

      const saved = await this.prisma.export.update({
        where: { id: record.id },
        data: { fileKey, status: 'READY' },
      });
      return this.toView(saved, proposal.title);
    } catch (error) {
      this.logger.error(`Export ${record.id} failed: ${(error as Error).message}`);
      await this.prisma.export.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw error;
    }
  }

  async list(organizationId: string, proposalId: string): Promise<ExportView[]> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      select: { title: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    const exports = await this.prisma.export.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return exports.map((item) => this.toView(item, proposal.title));
  }

  /** Reads the stored file back for download. */
  async download(organizationId: string, exportId: string) {
    const record = await this.prisma.export.findFirst({
      where: { id: exportId, proposal: { organizationId } },
      include: { proposal: { select: { title: true } } },
    });
    if (!record?.fileKey) throw new NotFoundException('Export not found');

    return {
      contents: await this.storage.read(record.fileKey),
      fileName: `${slugify(record.proposal.title)}.${record.format.toLowerCase()}`,
      contentType:
        record.format === 'DOCX'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
    };
  }

  private toView(
    record: { id: string; format: ExportFormat; status: string; createdAt: Date },
    proposalTitle: string,
  ): ExportView {
    return {
      id: record.id,
      format: record.format,
      status: record.status,
      fileName: `${slugify(proposalTitle)}.${record.format.toLowerCase()}`,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'proposal'
  );
}
