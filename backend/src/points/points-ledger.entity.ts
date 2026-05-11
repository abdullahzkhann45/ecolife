import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum LedgerEventType {
  TASK_COMPLETION = 'task_completion',
  STREAK_MILESTONE = 'streak_milestone',
  FIRST_CATEGORY_BONUS = 'first_category_bonus',
  PURCHASE = 'purchase',
  DAILY_CAP_REACHED = 'daily_cap_reached',
}

@Entity('points_ledger')
export class PointsLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  eventType: LedgerEventType;

  @Column()
  amount: number;

  @Column({ nullable: true })
  taskSubmissionId: string;

  @Column({ nullable: true })
  shopItemId: string;

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
