import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopItem, ShopItemSchema } from './shop-item.schema';
import { Inventory, InventorySchema } from './inventory.schema';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopItem.name, schema: ShopItemSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
    PointsModule,
  ],
  providers: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}
