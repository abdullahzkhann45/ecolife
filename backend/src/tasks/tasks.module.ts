import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './task.schema';
import { TaskSubmission, TaskSubmissionSchema } from './task-submission.schema';
import { TaskCommitment, TaskCommitmentSchema } from './task-commitment.schema';
import { GpsSession, GpsSessionSchema } from './gps-session.schema';
import { UserProgress, UserProgressSchema } from './user-progress.schema';
import { OnboardingResponse, OnboardingResponseSchema } from '../onboarding/onboarding-response.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GeminiVerifyService } from './gemini-verify.service';
import { GPSVerifyService } from './gps-verify.service';
import { GpsCleanupService } from './gps-cleanup.service';
import { PointsModule } from '../points/points.module';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: TaskSubmission.name, schema: TaskSubmissionSchema },
      { name: TaskCommitment.name, schema: TaskCommitmentSchema },
      { name: GpsSession.name, schema: GpsSessionSchema },
      { name: UserProgress.name, schema: UserProgressSchema },
      { name: OnboardingResponse.name, schema: OnboardingResponseSchema },
    ]),
    forwardRef(() => PointsModule),
    StreaksModule,
  ],
  providers: [TasksService, GeminiVerifyService, GPSVerifyService, GpsCleanupService],
  controllers: [TasksController],
  exports: [TasksService, MongooseModule],
})
export class TasksModule {}
