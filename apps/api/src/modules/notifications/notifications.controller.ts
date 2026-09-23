import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  markNotificationsReadSchema,
  type AuthUser,
  type MarkNotificationsReadInput,
} from '@grant/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { NotificationsService } from './notifications.service';

/** A person's own notifications, across every organization they belong to. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  /** Without `ids`, everything unread is marked read. */
  @Post('read')
  @HttpCode(204)
  markRead(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(markNotificationsReadSchema)) body: MarkNotificationsReadInput,
  ) {
    return this.notifications.markRead(user.id, body.ids);
  }
}
