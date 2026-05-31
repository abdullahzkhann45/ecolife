import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PointsLedgerDocument = PointsLedger & Document;

export enum LedgerEventType {
  TASK_COMPLETION = 'task_completion',
  STREAK_MILESTONE = 'streak_milestone',
  FIRST_CATEGORY_BONUS = 'first_category_bonus',
  DAILY_CAP_REACHED = 'daily_cap_reached',
}

@Schema({ timestamps: true })
export class PointsLedger {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: LedgerEventType })
  eventType: LedgerEventType;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Types.ObjectId, ref: 'TaskSubmission', default: null })
  taskSubmissionId: Types.ObjectId;

  @Prop({ required: true })
  description: string;
}

export const PointsLedgerSchema = SchemaFactory.createForClass(PointsLedger);
