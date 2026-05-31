import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'ShopItem', required: true })
  shopItemId: Types.ObjectId;

  @Prop({ default: false })
  isEquipped: boolean;

  @Prop({ default: () => new Date() })
  purchasedAt: Date;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
