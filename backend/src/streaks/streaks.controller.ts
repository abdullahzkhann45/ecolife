import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StreaksService } from './streaks.service';

@Controller('streaks')
@UseGuards(JwtAuthGuard)
export class StreaksController {
  constructor(private streaksService: StreaksService) {}

  @Get()
  getStreak(@Request() req) {
    return this.streaksService.getStreak(req.user.id);
  }
}
