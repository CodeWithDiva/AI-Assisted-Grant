import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateOrganizationSchema,
  OrgRole,
  type AuthUser,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateOrganizationInput,
} from '@grant/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createOrganizationSchema)) body: CreateOrganizationInput,
  ) {
    return this.organizations.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.organizations.listForUser(user.id);
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  findOne(@Param('orgId') orgId: string) {
    return this.organizations.findById(orgId);
  }

  @Patch(':orgId')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  update(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: UpdateOrganizationInput,
  ) {
    return this.organizations.update(orgId, body);
  }

  @Get(':orgId/members')
  @UseGuards(OrgMemberGuard)
  members(@Param('orgId') orgId: string) {
    return this.organizations.listMembers(orgId);
  }

  @Post(':orgId/invitations')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  invite(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.organizations.invite(orgId, user.id, body);
  }

  @Delete(':orgId/members/:membershipId')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(204)
  removeMember(@Param('orgId') orgId: string, @Param('membershipId') membershipId: string) {
    return this.organizations.removeMember(orgId, membershipId);
  }
}

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post(':token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.organizations.acceptInvitation(token, user);
  }
}
