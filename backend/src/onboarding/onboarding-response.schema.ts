import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OnboardingResponseDocument = OnboardingResponse & Document;

@Schema({ timestamps: true })
export class OnboardingResponse {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  answers: string;

  @Prop({ default: null })
  baselineScore: number;

  @Prop({ default: null })
  lifestyleType: string;

  @Prop({ default: null })
  categoryScores: string;

  @Prop({ default: () => new Date() })
  completedAt: Date;
}

export const OnboardingResponseSchema = SchemaFactory.createForClass(OnboardingResponse);
