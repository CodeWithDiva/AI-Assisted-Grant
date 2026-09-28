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
  createTemplateSchema,
  extractTemplateSchema,
  updateTemplateSchema,
  OrgRole,
  type AuthUser,
  type CreateTemplateInput,
  type ExtractTemplateInput,
  type UpdateTemplateInput,
} from '@grant/shared';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TemplatesService } from './templates.service';

@Throttle({ default: { ttl: 3_600_000, limit: 120 } })
@Controller('orgs/:orgId/templates')
@UseGuards(OrgMemberGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.templates.list(orgId);
  }

  @Get(':templateId')
  findOne(@Param('orgId') orgId: string, @Param('templateId') templateId: string) {
    return this.templates.findOne(orgId, templateId);
  }

  @Post('extract')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(200)
  extract(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(extractTemplateSchema)) body: ExtractTemplateInput,
  ) {
    return this.templates.extractFromDocument(orgId, user.id, body.documentId);
  }

  @Post()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  create(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(createTemplateSchema)) body: CreateTemplateInput,
  ) {
    return this.templates.create(orgId, body);
  }

  @Patch(':templateId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  update(
    @Param('orgId') orgId: string,
    @Param('templateId') templateId: string,
    @Body(new ZodValidationPipe(updateTemplateSchema)) body: UpdateTemplateInput,
  ) {
    return this.templates.update(orgId, templateId, body);
  }

  @Delete(':templateId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @Param('templateId') templateId: string) {
    return this.templates.remove(orgId, templateId);
  }
}
