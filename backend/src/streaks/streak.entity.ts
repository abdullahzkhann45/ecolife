import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('streaks')
export class Streak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  @Column({ nullable: true })
  lastCompletedDate: string;

  @Column({ default: false })
  freezeUsedThisPeriod: boolean;

  @Column({ nullable: true })
  freezePeriodStart: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
