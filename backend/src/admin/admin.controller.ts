import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('gps-sessions')
  getSessions(@Query() query: any) {
    return this.adminService.getGpsSessions(query);
  }

  @Get('gps-sessions/:id')
  getSessionDetail(@Param('id') id: string) {
    return this.adminService.getGpsSessionDetail(id);
  }

  @Patch('gps-sessions/:id/override')
  override(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason: string },
  ) {
    return this.adminService.overrideSession(id, req.user.id, body.action, body.reason);
  }
}
