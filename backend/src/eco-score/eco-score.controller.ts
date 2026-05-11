import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EcoScoreService } from './eco-score.service';

@Controller('eco-score')
@UseGuards(JwtAuthGuard)
export class EcoScoreController {
  constructor(private ecoScoreService: EcoScoreService) {}

  @Get()
  getScore(@Request() req) {
    return this.ecoScoreService.getScore(req.user.id);
  }
}
