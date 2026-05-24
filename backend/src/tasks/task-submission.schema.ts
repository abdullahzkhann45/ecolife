import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskSubmissionDocument = TaskSubmission & Document;

export enum SubmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPEALED = 'appealed',
  MANUAL_REVIEW = 'manual_review',
}

@Schema({ timestamps: true })
export class TaskSubmission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId: Types.ObjectId;

  @Prop({ default: SubmissionStatus.PENDING, enum: SubmissionStatus })
  status: SubmissionStatus;

  @Prop({ default: null })
  proofUrl: string;

  @Prop({ default: null })
  proofMetadata: string;

  @Prop({ default: null })
  rejectionReason: string;

  @Prop({ default: null })
  verifiedAt: Date;

  @Prop({ default: null })
  pointsAwarded: number;

  @Prop({ default: null })
  selfRating: number;
}

export const TaskSubmissionSchema = SchemaFactory.createForClass(TaskSubmission);
