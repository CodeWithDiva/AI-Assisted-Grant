import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrgRole,
  type AuthUser,
  type CreatedInvitation,
  type CreateOrganizationInput,
  type InvitationPreview,
  type InvitationView,
  type InviteMemberInput,
  type MemberView,
  type UpdateOrganizationInput,
} from '@grant/shared';
import { createHash, randomBytes } from 'node:crypto';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const INVITATION_DAYS = 7;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Creates the organization and makes the creator its owner. */
  async create(userId: string, input: CreateOrganizationInput) {
    return this.prisma.organization.create({
      data: {
        ...input,
        memberships: { create: { userId, role: OrgRole.OWNER } },
      },
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ organization, role }) => ({ ...organization, role }));
  }

  async findById(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  async update(organizationId: string, input: UpdateOrganizationInput) {
    await this.findById(organizationId);
    return this.prisma.organization.update({ where: { id: organizationId }, data: input });
  }

  async listMembers(organizationId: string): Promise<MemberView[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ id, role, createdAt, user }) => ({
      id,
      role,
      createdAt: createdAt.toISOString(),
      user,
    }));
  }

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    role: OrgRole,
  ): Promise<MemberView> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.role === OrgRole.OWNER && role !== OrgRole.OWNER) {
      await this.assertAnotherOwner(organizationId);
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return {
      id: updated.id,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
      user: updated.user,
    };
  }

  async removeMember(organizationId: string, membershipId: string): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.role === OrgRole.OWNER) await this.assertAnotherOwner(organizationId);

    await this.prisma.membership.delete({ where: { id: membership.id } });
  }

  /** Pending invitations only — accepted and expired ones are history. */
  async listInvitations(organizationId: string): Promise<InvitationView[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map((invitation) => this.toInvitationView(invitation));
  }

  /**
   * Creates an invitation and emails the link. The link is also returned once, so an owner
   * can share it directly when email is not configured.
   */
  async invite(
    organizationId: string,
    invitedById: string,
    input: InviteMemberInput,
  ): Promise<CreatedInvitation> {
    const email = input.email.toLowerCase();

    const alreadyMember = await this.prisma.membership.findFirst({
      where: { organizationId, user: { email } },
      select: { id: true },
    });
    if (alreadyMember) throw new BadRequestException('This person is already a member');

    // A new invitation replaces any pending one for the same address.
    await this.prisma.invitation.deleteMany({
      where: { organizationId, email, acceptedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        invitedById,
        email,
        role: input.role,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
      },
      include: {
        invitedBy: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });

    const link = `${this.config.get('WEB_ORIGIN', { infer: true })}/invite/${token}`;
    const emailed = await this.email.send({
      to: [email],
      subject: `${invitation.invitedBy.name} invited you to ${invitation.organization.name} on GrantPilot`,
      text: [
        `${invitation.invitedBy.name} has invited you to join ${invitation.organization.name} as ${input.role.toLowerCase()}.`,
        '',
        `Accept the invitation: ${link}`,
        '',
        `The link expires in ${INVITATION_DAYS} days.`,
      ].join('\n'),
    });

    return { ...this.toInvitationView(invitation), token, link, emailed };
  }

  async revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId, acceptedAt: null },
      select: { id: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.delete({ where: { id: invitation.id } });
  }

  /** Lets the invitee see who invited them before signing in. */
  async previewInvitation(token: string): Promise<InvitationPreview> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!invitation) throw new NotFoundException('This invitation link is not valid');

    return {
      organizationName: invitation.organization.name,
      invitedBy: invitation.invitedBy.name,
      email: invitation.email,
      role: invitation.role,
      status: invitation.acceptedAt
        ? 'ACCEPTED'
        : invitation.expiresAt < new Date()
          ? 'EXPIRED'
          : 'PENDING',
    };
  }

  async acceptInvitation(token: string, user: AuthUser) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) throw new BadRequestException('This invitation was already used');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('This invitation expired');
    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`,
      );
    }

    const [membership] = await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: {
          userId_organizationId: { userId: user.id, organizationId: invitation.organizationId },
        },
        create: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        update: {},
        include: { organization: true },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return { ...membership.organization, role: membership.role };
  }

  private async assertAnotherOwner(organizationId: string): Promise<void> {
    const owners = await this.prisma.membership.count({
      where: { organizationId, role: OrgRole.OWNER },
    });
    if (owners <= 1) {
      throw new BadRequestException('An organization must keep at least one owner');
    }
  }

  private toInvitationView(invitation: {
    id: string;
    email: string;
    role: OrgRole;
    expiresAt: Date;
    createdAt: Date;
    invitedBy: { name: string };
  }): InvitationView {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      invitedBy: invitation.invitedBy.name,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
