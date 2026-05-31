import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StreakDocument = Streak & Document;

@Schema({ timestamps: true })
export class Streak {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop({ default: null })
  lastCompletedDate: string;

  @Prop({ default: false })
  freezeUsedThisPeriod: boolean;

  @Prop({ default: null })
  freezePeriodStart: string;
}

export const StreakSchema = SchemaFactory.createForClass(Streak);
