import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('onboarding_responses')
export class OnboardingResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column('text')
  answers: string;

  @Column({ nullable: true })
  baselineScore: number;

  @CreateDateColumn()
  completedAt: Date;
}
