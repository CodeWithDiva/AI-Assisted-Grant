import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  createProposalSchema,
  generateSectionSchema,
  refineSectionSchema,
  updateProposalSchema,
  updateSectionSchema,
  OrgRole,
  type AuthUser,
  type CreateProposalInput,
  type GenerateSectionInput,
  type RefineSectionInput,
  type UpdateProposalInput,
  type UpdateSectionInput,
} from '@grant/shared';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ComplianceService } from './compliance.service';
import { ProposalsService } from './proposals.service';

@Throttle({ default: { ttl: 3_600_000, limit: 120 } })
@Controller('orgs/:orgId/proposals')
@UseGuards(OrgMemberGuard)
export class ProposalsController {
  constructor(
    private readonly proposals: ProposalsService,
    private readonly compliance: ComplianceService,
  ) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.proposals.list(orgId);
  }

  @Post()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createProposalSchema)) body: CreateProposalInput,
  ) {
    return this.proposals.create(orgId, user.id, body);
  }

  @Get(':proposalId')
  findOne(@Param('orgId') orgId: string, @Param('proposalId') proposalId: string) {
    return this.proposals.findOne(orgId, proposalId);
  }

  @Patch(':proposalId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  update(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Body(new ZodValidationPipe(updateProposalSchema)) body: UpdateProposalInput,
  ) {
    return this.proposals.update(orgId, proposalId, body);
  }

  @Delete(':proposalId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @Param('proposalId') proposalId: string) {
    return this.proposals.remove(orgId, proposalId);
  }

  @Patch(':proposalId/sections/:sectionId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  saveSection(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Param('sectionId') sectionId: string,
    @Body(new ZodValidationPipe(updateSectionSchema)) body: UpdateSectionInput,
  ) {
    return this.proposals.saveSectionText(orgId, proposalId, sectionId, body.text);
  }

  /** Server-sent events: `delta` while the AI writes, then `done` (or `error`). */
  @Post(':proposalId/sections/:sectionId/generate')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  async generate(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generateSectionSchema)) body: GenerateSectionInput,
    @Res() res: Response,
  ): Promise<void> {
    const send = openStream(res);
    try {
      const section = await this.proposals.generateSection(
        orgId,
        user.id,
        proposalId,
        sectionId,
        body.instruction,
        (delta) => send('delta', { text: delta }),
      );
      send('done', section);
    } catch (error) {
      send('error', { message: messageOf(error) });
    } finally {
      res.end();
    }
  }

  @Post(':proposalId/sections/:sectionId/refine')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  async refine(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(refineSectionSchema)) body: RefineSectionInput,
    @Res() res: Response,
  ): Promise<void> {
    const send = openStream(res);
    try {
      const section = await this.proposals.refineSection(
        orgId,
        user.id,
        proposalId,
        sectionId,
        body,
        (delta) => send('delta', { text: delta }),
      );
      send('done', section);
    } catch (error) {
      send('error', { message: messageOf(error) });
    } finally {
      res.end();
    }
  }

  /** Deterministic limit checks plus an AI review against the funder's criteria. */
  @Post(':proposalId/compliance')
  @HttpCode(200)
  complianceCheck(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.compliance.check(orgId, user.id, proposalId);
  }

  @Post(':proposalId/fit-score')
  @HttpCode(200)
  fitScore(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.compliance.fitScore(orgId, user.id, proposalId);
  }

  @Get(':proposalId/sections/:sectionId/versions')
  versions(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.proposals.listVersions(orgId, proposalId, sectionId);
  }

  @Post(':proposalId/sections/:sectionId/versions/:versionId/restore')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(200)
  restore(
    @Param('orgId') orgId: string,
    @Param('proposalId') proposalId: string,
    @Param('sectionId') sectionId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.proposals.restoreVersion(orgId, proposalId, sectionId, versionId);
  }
}

function openStream(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops proxies from buffering the stream into one lump.
    'X-Accel-Buffering': 'no',
  });
  return (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The AI could not complete this request';
}
