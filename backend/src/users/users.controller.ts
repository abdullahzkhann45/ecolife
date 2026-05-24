import { Controller, Get, Patch, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GpsSession, GpsSessionDocument } from '../tasks/gps-session.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    @InjectModel(GpsSession.name) private gpsSessionModel: Model<GpsSessionDocument>,
  ) {}

  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() body: any) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Delete('me/gps-data')
  async deleteGpsData(@Request() req) {
    const result = await this.gpsSessionModel.updateMany(
      { userId: req.user.id },
      { $set: { rawTrail: null, summary: null } },
    );
    return { deleted: result.modifiedCount };
  }
}
