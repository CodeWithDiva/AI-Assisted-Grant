import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ACCEPTED_DOCUMENT_MIME_TYPES, type DocumentKind, type OrgDocument } from '@grant/shared';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TextExtractionService } from './text-extraction.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly extraction: TextExtractionService,
    config: ConfigService<Env, true>,
  ) {
    this.maxBytes = config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024;
  }

  async upload(
    organizationId: string,
    userId: string,
    kind: DocumentKind,
    file: Express.Multer.File,
  ): Promise<OrgDocument> {
    if (!file) throw new BadRequestException('No file was uploaded');
    if (file.size > this.maxBytes) {
      throw new BadRequestException(`Files must be ${this.maxBytes / 1024 / 1024} MB or smaller`);
    }
    if (!ACCEPTED_DOCUMENT_MIME_TYPES.includes(file.mimetype as never)) {
      throw new BadRequestException('Only PDF, Word (.docx), text and Markdown files are accepted');
    }

    const fileKey = await this.storage.save(
      organizationId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
    const document = await this.prisma.document.create({
      data: {
        organizationId,
        uploadedById: userId,
        kind,
        fileKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: 'PROCESSING',
      },
    });

    // Small files extract in well under a second; Day 9 moves this to a background job.
    try {
      const text = await this.extraction.extract(file.mimetype, file.buffer);
      const updated = await this.prisma.document.update({
        where: { id: document.id },
        data: { extractedText: text, status: text ? 'READY' : 'FAILED' },
      });
      return this.toDto(updated, text.length);
    } catch (error) {
      this.logger.error(`Text extraction failed for ${document.id}: ${(error as Error).message}`);
      const failed = await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      });
      return this.toDto(failed, 0);
    }
  }

  /** Lists documents without pulling their full text back out of the database. */
  async list(organizationId: string): Promise<OrgDocument[]> {
    return this.prisma.$queryRaw<OrgDocument[]>`
      SELECT id, kind, "fileName", "mimeType", "sizeBytes", status,
             COALESCE(length("extractedText"), 0)::int AS "textLength",
             "createdAt"
      FROM documents
      WHERE "organizationId" = ${organizationId}
      ORDER BY "createdAt" DESC
    `;
  }

  /** Used by the AI layer to build proposal context. */
  async getText(organizationId: string, documentId: string): Promise<string> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
      select: { extractedText: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document.extractedText ?? '';
  }

  async remove(organizationId: string, documentId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true, fileKey: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id: document.id } });
    await this.storage.remove(document.fileKey).catch((error: Error) => {
      this.logger.warn(`Could not delete stored file ${document.fileKey}: ${error.message}`);
    });
  }

  private toDto(
    document: {
      id: string;
      kind: DocumentKind;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      status: OrgDocument['status'];
      createdAt: Date;
    },
    textLength: number,
  ): OrgDocument {
    return {
      id: document.id,
      kind: document.kind,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status,
      textLength,
      createdAt: document.createdAt.toISOString(),
    };
  }
}
