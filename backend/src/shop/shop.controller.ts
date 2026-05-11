import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopService } from './shop.service';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private shopService: ShopService) {}

  @Get()
  getItems() {
    return this.shopService.getShopItems();
  }

  @Post(':id/purchase')
  purchase(@Request() req, @Param('id') id: string) {
    return this.shopService.purchaseItem(req.user.id, id);
  }

  @Get('inventory')
  getInventory(@Request() req) {
    return this.shopService.getInventory(req.user.id);
  }

  @Post('inventory/:id/equip')
  equip(@Request() req, @Param('id') id: string) {
    return this.shopService.equipItem(req.user.id, id);
  }
}
