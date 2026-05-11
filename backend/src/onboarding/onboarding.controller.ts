import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private service: OnboardingService) {}

  @Get('questions')
  getQuestions() {
    return this.service.getQuestions();
  }

  @Post('submit')
  submit(@Request() req, @Body() body: { answers: Record<string, string> }) {
    return this.service.submitAnswers(req.user.id, body.answers);
  }

  @Get('response')
  getResponse(@Request() req) {
    return this.service.getResponse(req.user.id);
  }
}
