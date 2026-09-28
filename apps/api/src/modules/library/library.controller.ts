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
  createLibraryBlockSchema,
  updateLibraryBlockSchema,
  OrgRole,
  type AuthUser,
  type CreateLibraryBlockInput,
  type UpdateLibraryBlockInput,
} from '@grant/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LibraryService } from './library.service';

@Controller('orgs/:orgId/library')
@UseGuards(OrgMemberGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.library.list(orgId);
  }

  @Post()
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createLibraryBlockSchema)) body: CreateLibraryBlockInput,
  ) {
    return this.library.create(orgId, user.id, body);
  }

  @Patch(':blockId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  update(
    @Param('orgId') orgId: string,
    @Param('blockId') blockId: string,
    @Body(new ZodValidationPipe(updateLibraryBlockSchema)) body: UpdateLibraryBlockInput,
  ) {
    return this.library.update(orgId, blockId, body);
  }

  @Delete(':blockId')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  remove(@Param('orgId') orgId: string, @Param('blockId') blockId: string) {
    return this.library.remove(orgId, blockId);
  }

  @Post(':blockId/used')
  @Roles(OrgRole.OWNER, OrgRole.EDITOR)
  @HttpCode(204)
  markUsed(@Param('orgId') orgId: string, @Param('blockId') blockId: string) {
    return this.library.markUsed(orgId, blockId);
  }
}
