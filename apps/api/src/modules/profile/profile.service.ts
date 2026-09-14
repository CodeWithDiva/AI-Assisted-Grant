import { Injectable } from '@nestjs/common';
import type { OrgProfileInput } from '@grant/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(organizationId: string) {
    const profile = await this.prisma.orgProfile.findUnique({ where: { organizationId } });
    if (!profile) return null;

    return {
      ...profile,
      // Prisma returns Decimal; the API should hand the frontend a plain number.
      annualBudget: profile.annualBudget ? Number(profile.annualBudget) : null,
    };
  }

  async upsert(organizationId: string, input: OrgProfileInput) {
    const data = {
      mission: input.mission ?? null,
      vision: input.vision ?? null,
      programs: input.programs ?? [],
      beneficiaries: input.beneficiaries ?? null,
      annualBudget: input.annualBudget ?? null,
      currency: input.currency ?? 'USD',
      teamSummary: input.teamSummary ?? null,
      pastResults: input.pastResults ?? [],
    };

    const profile = await this.prisma.orgProfile.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });

    return {
      ...profile,
      annualBudget: profile.annualBudget ? Number(profile.annualBudget) : null,
    };
  }
}
