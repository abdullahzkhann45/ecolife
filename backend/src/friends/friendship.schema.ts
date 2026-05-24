import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendshipDocument = Friendship & Document;

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

@Schema({ timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addresseeId: Types.ObjectId;

  @Prop({ default: FriendshipStatus.PENDING, enum: FriendshipStatus })
  status: FriendshipStatus;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
