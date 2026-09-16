import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateAccountSchema,
  type AuthUser,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdateAccountInput,
} from '@grant/shared';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

/**
 * Only the endpoints that accept a password are worth brute-forcing, so only they get the
 * tight limit. `/auth/me` and `/auth/refresh` run on every page load and must not share it.
 */
const CREDENTIAL_LIMIT = { default: { ttl: 60_000, limit: 10 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(CREDENTIAL_LIMIT)
  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.register(body);
    await this.auth.issueTokens(user, res);
    return user;
  }

  @Throttle(CREDENTIAL_LIMIT)
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.validateCredentials(body);
    await this.auth.issueTokens(user, res);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    return this.auth.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE], res);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_TOKEN_COOKIE], res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  @Patch('me')
  updateAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
  ): Promise<AuthUser> {
    return this.auth.updateAccount(user.id, body);
  }

  /** Signs out every other session, then gives this one fresh tokens. */
  @Throttle(CREDENTIAL_LIMIT)
  @Post('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.changePassword(user.id, body);
    await this.auth.issueTokens(user, res);
  }
}
