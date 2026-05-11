import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskSubmission } from './task-submission.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GeminiVerifyService } from './gemini-verify.service';
import { PointsModule } from '../points/points.module';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskSubmission]),
    forwardRef(() => PointsModule),
    StreaksModule,
  ],
  providers: [TasksService, GeminiVerifyService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
