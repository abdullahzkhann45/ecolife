import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsLedger, LedgerEventType } from './points-ledger.entity';
import { Task } from '../tasks/task.entity';
import { StreaksService } from '../streaks/streaks.service';

const DAILY_CAP = 500;

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsLedger)
    private ledgerRepo: Repository<PointsLedger>,
    @Inject(forwardRef(() => StreaksService))
    private streaksService: StreaksService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    const entries = await this.ledgerRepo.find({ where: { userId } });
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }

  async getLedger(userId: string) {
    const entries = await this.ledgerRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const balance = entries.reduce((sum, e) => sum + e.amount, 0);
    return { balance, entries };
  }

  async getDailyEarned(userId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await this.ledgerRepo.find({ where: { userId } });
    return entries
      .filter(e => e.amount > 0 && e.createdAt.toISOString().slice(0, 10) === today)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  async awardTaskPoints(userId: string, submissionId: string, task: Task): Promise<number> {
    const dailyEarned = await this.getDailyEarned(userId);
    if (dailyEarned >= DAILY_CAP) return 0;

    const streak = await this.streaksService.getStreak(userId);
    const multiplier = this.streaksService.getMultiplier(streak.currentStreak);
    let points = Math.round(task.basePoints * multiplier);
    points = Math.min(points, DAILY_CAP - dailyEarned);

    await this.addEntry(userId, LedgerEventType.TASK_COMPLETION, points, submissionId, null,
      `Completed: ${task.title}`);

    // First category completion bonus
    const categoryEntries = await this.ledgerRepo.find({ where: { userId, eventType: LedgerEventType.FIRST_CATEGORY_BONUS } });
    const hasCategoryBonus = categoryEntries.some(e => e.description.includes(task.category));
    if (!hasCategoryBonus) {
      const bonus = Math.min(100, DAILY_CAP - dailyEarned - points);
      if (bonus > 0) {
        await this.addEntry(userId, LedgerEventType.FIRST_CATEGORY_BONUS, bonus, null, null,
          `First ${task.category} task bonus!`);
        points += bonus;
      }
    }

    return points;
  }

  async awardMilestoneBonus(userId: string, milestone: number, bonusPoints: number) {
    await this.addEntry(userId, LedgerEventType.STREAK_MILESTONE, bonusPoints, null, null,
      `${milestone}-day streak milestone! 🔥`);
  }

  async spendPoints(userId: string, shopItemId: string, amount: number, itemName: string) {
    const balance = await this.getBalance(userId);
    if (balance < amount) throw new Error('Insufficient points');
    await this.addEntry(userId, LedgerEventType.PURCHASE, -amount, null, shopItemId,
      `Purchased: ${itemName}`);
  }

  private async addEntry(
    userId: string,
    eventType: LedgerEventType,
    amount: number,
    taskSubmissionId: string | null,
    shopItemId: string | null,
    description: string,
  ) {
    const entry = this.ledgerRepo.create({ userId, eventType, amount, taskSubmissionId, shopItemId, description });
    return this.ledgerRepo.save(entry);
  }
}
