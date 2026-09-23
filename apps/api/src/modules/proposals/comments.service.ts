import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgRole, type CreateCommentInput, type ProposalCommentView } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';

const VIEW_SELECT = {
  id: true,
  sectionId: true,
  body: true,
  authorId: true,
  resolvedAt: true,
  createdAt: true,
  author: { select: { name: true } },
  resolvedBy: { select: { name: true } },
  section: { select: { title: true } },
} as const;

type CommentRow = {
  id: string;
  sectionId: string | null;
  body: string;
  authorId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  author: { name: string } | null;
  resolvedBy: { name: string } | null;
  section: { title: string } | null;
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every member can read and write review notes, including viewers. */
  async list(organizationId: string, proposalId: string): Promise<ProposalCommentView[]> {
    await this.requireProposal(organizationId, proposalId);
    const comments = await this.prisma.proposalComment.findMany({
      where: { proposalId },
      select: VIEW_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toView);
  }

  async create(
    organizationId: string,
    proposalId: string,
    userId: string,
    input: CreateCommentInput,
  ): Promise<ProposalCommentView> {
    await this.requireProposal(organizationId, proposalId);
    if (input.sectionId) {
      const section = await this.prisma.proposalSection.findFirst({
        where: { id: input.sectionId, proposalId },
        select: { id: true },
      });
      if (!section) throw new NotFoundException('Section not found');
    }

    const comment = await this.prisma.proposalComment.create({
      data: {
        proposalId,
        sectionId: input.sectionId,
        authorId: userId,
        body: input.body,
      },
      select: VIEW_SELECT,
    });
    return toView(comment);
  }

  async setResolved(
    organizationId: string,
    proposalId: string,
    commentId: string,
    userId: string,
    resolved: boolean,
  ): Promise<ProposalCommentView> {
    await this.requireComment(organizationId, proposalId, commentId);
    const comment = await this.prisma.proposalComment.update({
      where: { id: commentId },
      data: resolved
        ? { resolvedAt: new Date(), resolvedById: userId }
        : { resolvedAt: null, resolvedById: null },
      select: VIEW_SELECT,
    });
    return toView(comment);
  }

  /** The author can withdraw their own note; an owner can remove any. */
  async remove(
    organizationId: string,
    proposalId: string,
    commentId: string,
    userId: string,
    role: OrgRole,
  ): Promise<void> {
    const comment = await this.requireComment(organizationId, proposalId, commentId);
    if (comment.authorId !== userId && role !== OrgRole.OWNER) {
      throw new ForbiddenException('Only the author or an owner can delete a note');
    }
    await this.prisma.proposalComment.delete({ where: { id: commentId } });
  }

  private async requireProposal(organizationId: string, proposalId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId },
      select: { id: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
  }

  private async requireComment(
    organizationId: string,
    proposalId: string,
    commentId: string,
  ): Promise<{ authorId: string | null }> {
    await this.requireProposal(organizationId, proposalId);
    const comment = await this.prisma.proposalComment.findFirst({
      where: { id: commentId, proposalId },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException('Note not found');
    return comment;
  }
}

function toView(comment: CommentRow): ProposalCommentView {
  return {
    id: comment.id,
    sectionId: comment.sectionId,
    sectionTitle: comment.section?.title ?? null,
    body: comment.body,
    authorName: comment.author?.name ?? null,
    authorId: comment.authorId,
    resolvedAt: comment.resolvedAt?.toISOString() ?? null,
    resolvedByName: comment.resolvedBy?.name ?? null,
    createdAt: comment.createdAt.toISOString(),
  };
}
