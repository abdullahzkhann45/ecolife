import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnboardingResponse, OnboardingResponseSchema } from './onboarding-response.schema';
import { User, UserSchema } from '../users/user.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: OnboardingResponse.name, schema: OnboardingResponseSchema },
    { name: User.name, schema: UserSchema },
    { name: Task.name, schema: TaskSchema },
  ])],
  providers: [OnboardingService],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
