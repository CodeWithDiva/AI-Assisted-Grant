import { Body, Controller, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ExportFormat, OrgRole, type AuthUser } from '@grant/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ExportsService } from './exports.service';

const createExportSchema = z.object({ format: z.enum(ExportFormat) });

@Controller('orgs/:orgId')
@UseGuards(OrgMemberGuard)
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post('proposals/:proposalId/exports')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(201)
  create(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createExportSchema)) body: { format: ExportFormat },
  ) {
    return this.exports.create(orgId, user.id, proposalId, body.format);
  }

  @Get('proposals/:proposalId/exports')
  list(@Param('orgId') orgId: string, @Param('proposalId') proposalId: string) {
    return this.exports.list(orgId, proposalId);
  }

  @Get('exports/:exportId/download')
  async download(
    @Param('orgId') orgId: string,
    @Param('exportId') exportId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.exports.download(orgId, exportId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.contents);
  }
}
