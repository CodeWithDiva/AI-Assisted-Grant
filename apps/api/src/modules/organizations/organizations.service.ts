import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrgRole,
  type AuthUser,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateOrganizationInput,
} from '@grant/shared';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

const INVITATION_DAYS = 7;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async listMembers(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ id, role, createdAt, user }) => ({ id, role, createdAt, user }));
  }

  /**
   * Creates an invitation and returns its token. Until the email module exists (Day 10)
   * the token comes back in the response so invites can be shared manually.
   */
  async invite(organizationId: string, invitedById: string, input: InviteMemberInput) {
    const email = input.email.toLowerCase();

    const alreadyMember = await this.prisma.membership.findFirst({
      where: { organizationId, user: { email } },
      select: { id: true },
    });
    if (alreadyMember) throw new BadRequestException('This person is already a member');

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
      select: { id: true, email: true, role: true, expiresAt: true },
    });

    return { ...invitation, token };
  }

  async acceptInvitation(token: string, user: AuthUser) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) throw new BadRequestException('This invitation was already used');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('This invitation expired');
    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
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

  async removeMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.role === OrgRole.OWNER) {
      const owners = await this.prisma.membership.count({
        where: { organizationId, role: OrgRole.OWNER },
      });
      if (owners <= 1)
        throw new BadRequestException('An organization must keep at least one owner');
    }

    await this.prisma.membership.delete({ where: { id: membership.id } });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
