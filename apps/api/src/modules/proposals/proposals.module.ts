import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ProposalContextService } from './proposal-context.service';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  controllers: [ProposalsController],
  providers: [ProposalsService, ComplianceService, ProposalContextService],
  exports: [ProposalsService, ComplianceService],
})
export class ProposalsModule {}
