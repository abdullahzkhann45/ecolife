import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShopItem } from './shop-item.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  shopItemId: string;

  @Column({ default: false })
  isEquipped: boolean;

  @ManyToOne(() => ShopItem)
  @JoinColumn({ name: 'shopItemId' })
  shopItem: ShopItem;

  @CreateDateColumn()
  purchasedAt: Date;
}
