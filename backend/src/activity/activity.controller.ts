import { Controller, Get, Query, UseGuards, Request, Res, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityService } from './activity.service';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Controller('activity')
export class ActivityController {
  constructor(
    private activityService: ActivityService,
    private jwtService: JwtService,
  ) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Request() req, @Query('start') start: string, @Query('end') end: string) {
    const s = start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const e = end || new Date().toISOString().slice(0, 10);
    return this.activityService.getHistory(req.user.id, s, e);
  }

  @Get('report')
  async downloadReport(@Request() req, @Query('start') start: string, @Query('end') end: string, @Query('token') token: string, @Res() res: Response) {
    let userId: string;
    if (req.headers.authorization) {
      try {
        const jwt = req.headers.authorization.replace('Bearer ', '');
        const payload = this.jwtService.verify(jwt);
        userId = payload.sub;
      } catch { throw new UnauthorizedException(); }
    } else if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.sub;
      } catch { throw new UnauthorizedException(); }
    } else {
      throw new UnauthorizedException();
    }

    const s = start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const e = end || new Date().toISOString().slice(0, 10);
    const csv = await this.activityService.generateCSV(userId, s, e);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ecolife-report-${s}-${e}.csv`);
    res.send(csv);
  }

  @Get('snapshot')
  @UseGuards(JwtAuthGuard)
  snapshot(@Request() req) {
    return this.activityService.recordDailySnapshot(req.user.id);
  }
}
