import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ShopItemType {
  COSMETIC = 'cosmetic',
  BOOSTER = 'booster',
}

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  type: ShopItemType;

  @Column()
  price: number;

  @Column({ nullable: true })
  imageEmoji: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
