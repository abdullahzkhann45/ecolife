import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShopItemDocument = ShopItem & Document;

export enum ShopItemType {
  COSMETIC = 'cosmetic',
  BOOSTER = 'booster',
}

@Schema({ timestamps: true })
export class ShopItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ShopItemType })
  type: ShopItemType;

  @Prop({ required: true })
  price: number;

  @Prop({ default: null })
  imageEmoji: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ShopItemSchema = SchemaFactory.createForClass(ShopItem);
