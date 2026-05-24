import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: null })
  avatarItem: string;

  @Prop({ default: null })
  profileTheme: string;

  @Prop({ default: false })
  onboardingCompleted: boolean;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: false })
  gpsConsentShown: boolean;

  @Prop({ default: null })
  lifestyleType: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
