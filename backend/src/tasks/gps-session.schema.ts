import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GpsSessionDocument = GpsSession & Document;

@Schema({ timestamps: true })
export class GpsSession {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'TaskSubmission', default: null })
  submissionId: Types.ObjectId;

  @Prop({ default: null })
  rawTrail: string;

  @Prop({ default: null })
  summary: string;

  @Prop({ default: 0 })
  pointCount: number;

  @Prop({ default: 0 })
  distanceMeters: number;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ default: 0 })
  avgSpeedKmh: number;

  @Prop({ default: 0 })
  maxSpeedKmh: number;

  @Prop({ default: 'unknown' })
  mode: string;

  @Prop({ default: 'pending' })
  verdict: string;

  @Prop({ default: 0 })
  confidence: number;

  @Prop({ default: null })
  antiCheatFlags: string;

  @Prop({ default: null })
  adminOverrideBy: string;

  @Prop({ default: null })
  adminOverrideReason: string;

  @Prop({ default: null })
  expiresAt: Date;
}

export const GpsSessionSchema = SchemaFactory.createForClass(GpsSession);
