import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskCommitmentDocument = TaskCommitment & Document;

@Schema({ timestamps: true })
export class TaskCommitment {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: () => new Date() })
  committedAt: Date;
}

export const TaskCommitmentSchema = SchemaFactory.createForClass(TaskCommitment);
TaskCommitmentSchema.index({ userId: 1, taskId: 1 }, { unique: true });
