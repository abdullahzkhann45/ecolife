import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TaskCategory {
  TRANSPORT = 'transport',
  DIET = 'diet',
  ENERGY = 'energy',
  WASTE = 'waste',
  CONSUMPTION = 'consumption',
}

export enum VerificationMechanism {
  PHOTO = 'photo',
  SENSOR = 'sensor',
  GEO = 'geo',
  RECEIPT = 'receipt',
  SELF_ATTEST = 'self_attest',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  category: TaskCategory;

  @Column()
  verificationMechanism: VerificationMechanism;

  @Column({ default: 100 })
  basePoints: number;

  @Column({ default: 0 })
  co2SavedGrams: number;

  @Column({ default: 0 })
  waterSavedLiters: number;

  @Column({ default: 0 })
  wasteDivertedGrams: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  proofInstructions: string;

  @CreateDateColumn()
  createdAt: Date;
}
