import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PointsLedger, PointsLedgerSchema } from './points-ledger.schema';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { StreaksModule } from '../streaks/streaks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PointsLedger.name, schema: PointsLedgerSchema }]),
    forwardRef(() => StreaksModule),
  ],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
