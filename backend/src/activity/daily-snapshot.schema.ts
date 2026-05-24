import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DailySnapshotDocument = DailySnapshot & Document;

@Schema({ timestamps: true })
export class DailySnapshot {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  date: string;

  @Prop({ default: 0 })
  ecoScore: number;

  @Prop({ default: 0 })
  tasksCompleted: number;

  @Prop({ default: 0 })
  tasksCommitted: number;

  @Prop({ default: 0 })
  completionRate: number;

  @Prop({ default: 0 })
  pointsEarned: number;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  co2SavedGrams: number;

  @Prop({ default: 0 })
  waterSavedLiters: number;

  @Prop({ default: 0 })
  wasteDivertedGrams: number;

  @Prop({ default: null })
  categoryBreakdown: string;
}

export const DailySnapshotSchema = SchemaFactory.createForClass(DailySnapshot);
DailySnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });
