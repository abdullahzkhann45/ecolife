import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailySnapshot, DailySnapshotSchema } from './daily-snapshot.schema';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { EcoScoreModule } from '../eco-score/eco-score.module';
import { TasksModule } from '../tasks/tasks.module';
import { StreaksModule } from '../streaks/streaks.module';
import { PointsModule } from '../points/points.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DailySnapshot.name, schema: DailySnapshotSchema }]),
    forwardRef(() => EcoScoreModule),
    forwardRef(() => TasksModule),
    StreaksModule,
    forwardRef(() => PointsModule),
    AuthModule,
  ],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
