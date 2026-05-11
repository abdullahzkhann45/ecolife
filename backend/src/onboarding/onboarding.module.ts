import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingResponse } from './onboarding-response.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OnboardingResponse, User, Task])],
  providers: [OnboardingService],
  controllers: [OnboardingController],
})
export class OnboardingModule {}
