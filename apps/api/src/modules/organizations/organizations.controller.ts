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
  updateMemberRoleSchema,
  updateOrganizationSchema,
  OrgRole,
  type AuthUser,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type UpdateOrganizationInput,
} from '@grant/shared';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
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

  @Patch(':orgId/members/:membershipId')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: UpdateMemberRoleInput,
  ) {
    return this.organizations.updateMemberRole(orgId, membershipId, body.role);
  }

  @Delete(':orgId/members/:membershipId')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(204)
  removeMember(@Param('orgId') orgId: string, @Param('membershipId') membershipId: string) {
    return this.organizations.removeMember(orgId, membershipId);
  }

  @Get(':orgId/invitations')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  invitations(@Param('orgId') orgId: string) {
    return this.organizations.listInvitations(orgId);
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

  @Delete(':orgId/invitations/:invitationId')
  @UseGuards(OrgMemberGuard)
  @Roles(OrgRole.OWNER)
  @HttpCode(204)
  revokeInvitation(@Param('orgId') orgId: string, @Param('invitationId') invitationId: string) {
    return this.organizations.revokeInvitation(orgId, invitationId);
  }
}

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /** Public so the invitee can see what they are joining before signing in. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get(':token')
  preview(@Param('token') token: string) {
    return this.organizations.previewInvitation(token);
  }

  @Post(':token/accept')
  @HttpCode(200)
  accept(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.organizations.acceptInvitation(token, user);
  }
}
