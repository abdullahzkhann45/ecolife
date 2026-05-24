import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsSession, GpsSessionSchema } from '../tasks/gps-session.schema';
import { TaskSubmission, TaskSubmissionSchema } from '../tasks/task-submission.schema';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GpsSession.name, schema: GpsSessionSchema },
      { name: TaskSubmission.name, schema: TaskSubmissionSchema },
    ]),
    PointsModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
