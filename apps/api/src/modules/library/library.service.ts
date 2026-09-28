import { Injectable, NotFoundException } from '@nestjs/common';
import {
  countWords,
  type CreateLibraryBlockInput,
  type LibraryBlockView,
  type UpdateLibraryBlockInput,
} from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';

const VIEW_SELECT = {
  id: true,
  title: true,
  body: true,
  category: true,
  usageCount: true,
  updatedAt: true,
  createdBy: { select: { name: true } },
} as const;

type BlockRow = {
  id: string;
  title: string;
  body: string;
  category: LibraryBlockView['category'];
  usageCount: number;
  updatedAt: Date;
  createdBy: { name: string } | null;
};

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string): Promise<LibraryBlockView[]> {
    const blocks = await this.prisma.libraryBlock.findMany({
      where: { organizationId },
      select: VIEW_SELECT,
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
    return blocks.map(toView);
  }

  async create(
    organizationId: string,
    userId: string,
    input: CreateLibraryBlockInput,
  ): Promise<LibraryBlockView> {
    const block = await this.prisma.libraryBlock.create({
      data: { ...input, organizationId, createdById: userId },
      select: VIEW_SELECT,
    });
    return toView(block);
  }

  async update(
    organizationId: string,
    blockId: string,
    input: UpdateLibraryBlockInput,
  ): Promise<LibraryBlockView> {
    await this.requireBlock(organizationId, blockId);
    const block = await this.prisma.libraryBlock.update({
      where: { id: blockId },
      data: input,
      select: VIEW_SELECT,
    });
    return toView(block);
  }

  async remove(organizationId: string, blockId: string): Promise<void> {
    await this.requireBlock(organizationId, blockId);
    await this.prisma.libraryBlock.delete({ where: { id: blockId } });
  }

  /** Counted when a writer inserts the passage, so the most reused ones rise to the top. */
  async markUsed(organizationId: string, blockId: string): Promise<void> {
    await this.requireBlock(organizationId, blockId);
    await this.prisma.libraryBlock.update({
      where: { id: blockId },
      data: { usageCount: { increment: 1 } },
    });
  }

  private async requireBlock(organizationId: string, blockId: string): Promise<void> {
    const block = await this.prisma.libraryBlock.findFirst({
      where: { id: blockId, organizationId },
      select: { id: true },
    });
    if (!block) throw new NotFoundException('Library passage not found');
  }
}

function toView(block: BlockRow): LibraryBlockView {
  return {
    id: block.id,
    title: block.title,
    body: block.body,
    category: block.category,
    wordCount: countWords(block.body),
    usageCount: block.usageCount,
    createdByName: block.createdBy?.name ?? null,
    updatedAt: block.updatedAt.toISOString(),
  };
}
