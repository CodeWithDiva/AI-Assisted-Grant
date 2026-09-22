import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthUser,
  ChangeEmailInput,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateAccountInput,
} from '@grant/shared';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { emailChangedEmail, passwordResetEmail } from '../email/email-templates';
import { EmailService } from '../email/email.service';
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_DAYS,
} from './auth.constants';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_MINUTES = 60;
/** At most one reset email per account per minute, so the form cannot be used to spam. */
const RESET_RESEND_SECONDS = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly email: EmailService,
  ) {}

  async register(input: RegisterInput): Promise<AuthUser> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException('An account with this email already exists');

    return this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      },
      select: { id: true, email: true, name: true },
    });
  }

  async validateCredentials(input: LoginInput): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    // Same message for unknown email and wrong password, so accounts cannot be probed.
    if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  async updateAccount(userId: string, input: UpdateAccountInput): Promise<AuthUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
      select: { id: true, email: true, name: true },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('The current password is not correct');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) },
      }),
      // A changed password should end every existing session, including stolen ones.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Requires the current password; the old address is told about the change. */
  async changeEmail(userId: string, input: ChangeEmailInput): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('The current password is not correct');
    }

    const email = input.email.toLowerCase();
    if (email === user.email) return { id: user.id, email: user.email, name: user.name };

    const taken = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw new ConflictException('Another account already uses this email');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email, emailVerifiedAt: null },
      select: { id: true, email: true, name: true },
    });
    await this.email.send({
      to: [user.email],
      ...emailChangedEmail({ name: user.name, newEmail: email }),
    });
    return updated;
  }

  /**
   * Emails a one-time link. Answers the same way whether or not the account exists, so the
   * form cannot be used to find out who has an account.
   */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: rawEmail.toLowerCase() },
      select: { id: true, name: true, email: true },
    });
    if (!user) return;

    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - RESET_RESEND_SECONDS * 1000) },
      },
      select: { id: true },
    });
    if (recent) return;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // Only the newest link works.
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
        },
      }),
    ]);

    const link = `${this.config.get('WEB_ORIGIN', { infer: true })}/reset-password/${token}`;
    const sent = await this.email.send({
      to: [user.email],
      ...passwordResetEmail({ name: user.name, link, expiresInMinutes: RESET_TOKEN_MINUTES }),
    });
    if (!sent) this.logger.warn(`Password reset email to user ${user.id} could not be sent`);
  }

  /** Sets the new password, ends every session, and returns the user to sign in. */
  async resetPassword(token: string, password: string): Promise<AuthUser> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { select: { id: true, email: true, name: true, emailVerifiedAt: true } } },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Ask for a new one.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: {
          passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          // Opening the emailed link proves the address belongs to them.
          emailVerifiedAt: stored.user.emailVerifiedAt ?? now,
        },
      }),
      this.prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: now } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { id: stored.user.id, email: stored.user.email, name: stored.user.name };
  }

  async issueTokens(user: AuthUser, res: Response): Promise<void> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt },
    });

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, this.cookieOptions(ACCESS_COOKIE_MAX_AGE));
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.cookieOptions(REFRESH_COOKIE_MAX_AGE),
      path: REFRESH_COOKIE_PATH,
    });
  }

  /** Verifies the refresh token, revokes it and issues a fresh pair (rotation). */
  async refresh(rawToken: string | undefined, res: Response): Promise<AuthUser> {
    if (!rawToken) throw new UnauthorizedException('No refresh token');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired, please sign in again');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await this.issueTokens(stored.user, res);
    return stored.user;
  }

  async logout(rawToken: string | undefined, res: Response): Promise<void> {
    if (rawToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions(0));
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...this.cookieOptions(0), path: REFRESH_COOKIE_PATH });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private cookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      maxAge,
      path: '/',
    };
  }
}
