import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopItem, ShopItemDocument, ShopItemType } from './shop-item.schema';
import { Inventory, InventoryDocument } from './inventory.schema';
import { PointsService } from '../points/points.service';

const SEED_ITEMS = [
  { name: 'Leaf Badge', description: 'A shiny leaf badge for your profile.', type: ShopItemType.COSMETIC, price: 200, imageEmoji: '🍃' },
  { name: 'Green Flame', description: 'Custom green streak flame color.', type: ShopItemType.COSMETIC, price: 500, imageEmoji: '🔥' },
  { name: 'Earth Avatar', description: 'Earth globe avatar frame.', type: ShopItemType.COSMETIC, price: 350, imageEmoji: '🌍' },
  { name: 'Sunflower Theme', description: 'Sunflower profile theme.', type: ShopItemType.COSMETIC, price: 750, imageEmoji: '🌻' },
  { name: 'Recycling Champion', description: 'Badge for recycling heroes.', type: ShopItemType.COSMETIC, price: 400, imageEmoji: '♻️' },
  { name: 'Streak Freeze', description: 'Protect your streak for one missed day.', type: ShopItemType.BOOSTER, price: 300, imageEmoji: '🧊' },
  { name: 'Double Points (1hr)', description: 'Earn 2x points for one hour.', type: ShopItemType.BOOSTER, price: 250, imageEmoji: '⚡' },
  { name: 'Solar Panel Badge', description: 'Energy saver badge.', type: ShopItemType.COSMETIC, price: 600, imageEmoji: '☀️' },
  { name: 'Bike Hero Badge', description: 'For commuters who choose wheels.', type: ShopItemType.COSMETIC, price: 450, imageEmoji: '🚲' },
  { name: 'Ocean Guardian', description: 'Exclusive ocean-themed profile frame.', type: ShopItemType.COSMETIC, price: 900, imageEmoji: '🌊' },
];

@Injectable()
export class ShopService implements OnModuleInit {
  constructor(
    @InjectModel(ShopItem.name) private shopItemModel: Model<ShopItemDocument>,
    @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
    private pointsService: PointsService,
  ) {}

  async onModuleInit() {
    const count = await this.shopItemModel.countDocuments();
    if (count === 0) {
      await this.shopItemModel.insertMany(SEED_ITEMS);
      console.log('Seeded shop items');
    }
  }

  async getShopItems() {
    return this.shopItemModel.find({ isActive: true });
  }

  async purchaseItem(userId: string, itemId: string) {
    const item = await this.shopItemModel.findById(itemId);
    if (!item) throw new NotFoundException('Item not found');

    const balance = await this.pointsService.getBalance(userId);
    if (balance < item.price) throw new BadRequestException(`Insufficient points. Need ${item.price}, have ${balance}.`);

    const alreadyOwned = await this.inventoryModel.findOne({ userId, shopItemId: itemId });
    if (alreadyOwned) throw new BadRequestException('You already own this item');

    await this.pointsService.spendPoints(userId, itemId, item.price, item.name);

    return this.inventoryModel.create({ userId, shopItemId: itemId });
  }

  async getInventory(userId: string) {
    return this.inventoryModel.find({ userId }).populate('shopItemId');
  }

  async equipItem(userId: string, inventoryId: string) {
    const item = await this.inventoryModel.findOne({ _id: inventoryId, userId }).populate('shopItemId');
    if (!item) throw new NotFoundException('Item not found in inventory');
    item.isEquipped = !item.isEquipped;
    return item.save();
  }
}
