import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopItem } from './shop-item.entity';
import { Inventory } from './inventory.entity';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShopItem, Inventory]), PointsModule],
  providers: [ShopService],
  controllers: [ShopController],
})
export class ShopModule {}
