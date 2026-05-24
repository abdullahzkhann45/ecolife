import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GpsSession, GpsSessionDocument } from './gps-session.schema';

@Injectable()
export class GpsCleanupService {
  private readonly logger = new Logger(GpsCleanupService.name);

  constructor(
    @InjectModel(GpsSession.name) private gpsSessionModel: Model<GpsSessionDocument>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredTrails() {
    const now = new Date();
    const result = await this.gpsSessionModel.updateMany(
      { expiresAt: { $lt: now }, rawTrail: { $ne: null } },
      { $set: { rawTrail: null } },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Cleaned raw trails from ${result.modifiedCount} expired GPS sessions`);
    }
  }
}
