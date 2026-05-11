import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskSubmission } from '../tasks/task-submission.entity';
import { Task } from '../tasks/task.entity';
import { OnboardingResponse } from '../onboarding/onboarding-response.entity';
import { EcoScoreService } from './eco-score.service';
import { EcoScoreController } from './eco-score.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskSubmission, Task, OnboardingResponse])],
  providers: [EcoScoreService],
  controllers: [EcoScoreController],
})
export class EcoScoreModule {}
