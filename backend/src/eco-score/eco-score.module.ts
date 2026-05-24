import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskSubmission, TaskSubmissionSchema } from '../tasks/task-submission.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { TaskCommitment, TaskCommitmentSchema } from '../tasks/task-commitment.schema';
import { OnboardingResponse, OnboardingResponseSchema } from '../onboarding/onboarding-response.schema';
import { EcoScoreService } from './eco-score.service';
import { EcoScoreController } from './eco-score.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: TaskSubmission.name, schema: TaskSubmissionSchema },
    { name: Task.name, schema: TaskSchema },
    { name: TaskCommitment.name, schema: TaskCommitmentSchema },
    { name: OnboardingResponse.name, schema: OnboardingResponseSchema },
  ])],
  providers: [EcoScoreService],
  controllers: [EcoScoreController],
  exports: [EcoScoreService],
})
export class EcoScoreModule {}
