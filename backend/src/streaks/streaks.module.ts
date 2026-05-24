import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Streak, StreakSchema } from './streak.schema';
import { StreaksService } from './streaks.service';
import { StreaksController } from './streaks.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Streak.name, schema: StreakSchema }])],
  providers: [StreaksService],
  controllers: [StreaksController],
  exports: [StreaksService],
})
export class StreaksModule {}
