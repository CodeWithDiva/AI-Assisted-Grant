import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createDeadlineSchema,
  updateDeadlineSchema,
  OrgRole,
  type CreateDeadlineInput,
  type UpdateDeadlineInput,
} from '@grant/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DeadlinesService } from './deadlines.service';
import { RemindersService } from './reminders.service';

@Controller('orgs/:orgId/deadlines')
@UseGuards(OrgMemberGuard)
export class DeadlinesController {
  constructor(
    private readonly deadlines: DeadlinesService,
    private readonly reminders: RemindersService,
  ) {}

  @Get()
  list(@Param('orgId') orgId: string, @Query('scope') scope?: string) {
    return this.deadlines.list(orgId, scope === 'open' ? 'open' : 'all');
  }

  @Post()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  create(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(createDeadlineSchema)) body: CreateDeadlineInput,
  ) {
    return this.deadlines.create(orgId, body);
  }

  @Patch(':deadlineId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  update(
    @Param('orgId') orgId: string,
    @Param('deadlineId') deadlineId: string,
    @Body(new ZodValidationPipe(updateDeadlineSchema)) body: UpdateDeadlineInput,
  ) {
    return this.deadlines.update(orgId, deadlineId, body);
  }

  @Delete(':deadlineId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @Param('deadlineId') deadlineId: string) {
    return this.deadlines.remove(orgId, deadlineId);
  }

  @Get(':deadlineId/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="deadline.ics"')
  ics(@Param('orgId') orgId: string, @Param('deadlineId') deadlineId: string) {
    return this.deadlines.toIcs(orgId, deadlineId);
  }

  /** Runs the reminder job now instead of waiting for the 08:00 schedule. */
  @Post('run-reminders')
  @Roles(OrgRole.OWNER)
  @HttpCode(200)
  async runReminders(@Param('orgId') orgId: string) {
    return { sent: await this.reminders.run(orgId) };
  }
}
