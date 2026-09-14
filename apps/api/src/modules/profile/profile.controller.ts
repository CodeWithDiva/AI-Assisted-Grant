import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { orgProfileSchema, OrgRole, type OrgProfileInput } from '@grant/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProfileService } from './profile.service';

@Controller('orgs/:orgId/profile')
@UseGuards(OrgMemberGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@Param('orgId') orgId: string) {
    return this.profile.get(orgId);
  }

  @Put()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  update(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(orgProfileSchema)) body: OrgProfileInput,
  ) {
    return this.profile.upsert(orgId, body);
  }
}
