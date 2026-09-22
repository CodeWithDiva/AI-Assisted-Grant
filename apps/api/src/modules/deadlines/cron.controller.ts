import {
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import type { Env } from '../../config/env';
import { RemindersService } from './reminders.service';

/**
 * On free hosting the API sleeps when idle, so the in-process 08:00 job may never fire.
 * A scheduled GitHub Actions workflow calls this instead; it wakes the API and runs the job.
 * Disabled (404) unless CRON_SECRET is set.
 */
@Controller('cron')
export class CronController {
  constructor(
    private readonly reminders: RemindersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('reminders')
  @HttpCode(200)
  async runReminders(@Headers('x-cron-secret') provided?: string): Promise<{ sent: number }> {
    const secret = this.config.get('CRON_SECRET', { infer: true });
    if (!secret) throw new NotFoundException();
    if (!provided || !sameSecret(provided, secret)) throw new UnauthorizedException();
    return { sent: await this.reminders.run() };
  }
}

/** Compares hashes so the check takes the same time whatever the input. */
function sameSecret(provided: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
