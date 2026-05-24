import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskDocument = Task & Document;

export enum TaskCategory {
  TRANSPORT = 'transport',
  DIET = 'diet',
  ENERGY = 'energy',
  WASTE = 'waste',
  CONSUMPTION = 'consumption',
  WATER = 'water',
}

export enum VerificationMechanism {
  PHOTO = 'photo',
  SENSOR = 'sensor',
  GEO = 'geo',
  RECEIPT = 'receipt',
  SELF_ATTEST = 'self_attest',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: TaskCategory })
  category: TaskCategory;

  @Prop({ required: true, enum: VerificationMechanism })
  verificationMechanism: VerificationMechanism;

  @Prop({ default: 100 })
  basePoints: number;

  @Prop({ default: 0 })
  co2SavedGrams: number;

  @Prop({ default: 0 })
  waterSavedLiters: number;

  @Prop({ default: 0 })
  wasteDivertedGrams: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  proofInstructions: string;

  @Prop({ default: false })
  selfRatingEnabled: boolean;

  @Prop({ default: null })
  lifestyleTypes: string;

  @Prop({ default: null })
  geminiPromptHint: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
