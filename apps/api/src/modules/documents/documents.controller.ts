import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentKind, OrgRole, type AuthUser } from '@grant/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DocumentsService } from './documents.service';

const uploadBodySchema = z.object({ kind: z.enum(DocumentKind) });

@Controller('orgs/:orgId/documents')
@UseGuards(OrgMemberGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.documents.list(orgId);
  }

  @Post()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(uploadBodySchema)) body: { kind: DocumentKind },
  ) {
    return this.documents.upload(orgId, user.id, body.kind, file);
  }

  @Delete(':documentId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @Param('documentId') documentId: string) {
    return this.documents.remove(orgId, documentId);
  }
}
