import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ProposalContextService } from './proposal-context.service';
import { ProposalsController } from './proposals.controller';
import { CommentsService } from './comments.service';
import { ProposalsService } from './proposals.service';

@Module({
  controllers: [ProposalsController],
  providers: [ProposalsService, CommentsService, ComplianceService, ProposalContextService],
  exports: [ProposalsService, ComplianceService],
})
export class ProposalsModule {}
