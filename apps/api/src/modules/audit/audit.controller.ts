import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { AuditService } from './audit.service';

@Controller('orgs/:orgId/activity')
@UseGuards(OrgMemberGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Newest first; `before` is an ISO timestamp for the next page. */
  @Get()
  list(@Param('orgId') orgId: string, @Query('before') before?: string) {
    return this.audit.list(orgId, before);
  }
}
