import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [users, organizations, proposals, documents, templates, byStatus] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.proposal.count(),
      this.prisma.document.count(),
      this.prisma.funderTemplate.count({ where: { organizationId: { not: null } } }),
      this.prisma.proposal.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      users,
      organizations,
      proposals,
      documents,
      orgTemplates: templates,
      proposalsByStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    };
  }

  /** Token spend and failure rate, so AI cost can be watched before the bill arrives. */
  async aiUsage(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byKind, failures] = await Promise.all([
      this.prisma.aiGeneration.groupBy({
        by: ['kind'],
        where: { createdAt: { gte: since }, status: 'SUCCESS' },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiGeneration.count({ where: { createdAt: { gte: since }, status: 'FAILED' } }),
    ]);

    return {
      days,
      failures,
      totals: {
        calls: byKind.reduce((sum, row) => sum + row._count._all, 0),
        inputTokens: byKind.reduce((sum, row) => sum + (row._sum.inputTokens ?? 0), 0),
        outputTokens: byKind.reduce((sum, row) => sum + (row._sum.outputTokens ?? 0), 0),
      },
      byKind: byKind.map((row) => ({
        kind: row.kind,
        calls: row._count._all,
        inputTokens: row._sum.inputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        averageLatencyMs: Math.round(row._avg.latencyMs ?? 0),
      })),
    };
  }
}
