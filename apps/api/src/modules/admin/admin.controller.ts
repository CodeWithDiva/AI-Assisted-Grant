import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('ai-usage')
  aiUsage(@Query('days') days?: string) {
    const window = Number(days);
    return this.admin.aiUsage(Number.isFinite(window) && window > 0 ? Math.min(window, 365) : 30);
  }
}
