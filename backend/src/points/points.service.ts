import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PointsLedger, PointsLedgerDocument, LedgerEventType } from './points-ledger.schema';
import { StreaksService } from '../streaks/streaks.service';

const DAILY_CAP = 500;

@Injectable()
export class PointsService {
  constructor(
    @InjectModel(PointsLedger.name) private ledgerModel: Model<PointsLedgerDocument>,
    @Inject(forwardRef(() => StreaksService))
    private streaksService: StreaksService,
  ) {}

  async getBalance(userId: string): Promise<number> {
    const entries = await this.ledgerModel.find({ userId });
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }

  async getLedger(userId: string) {
    const entries = await this.ledgerModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const allEntries = await this.ledgerModel.find({ userId });
    const balance = allEntries.reduce((sum, e) => sum + e.amount, 0);
    return { balance, entries };
  }

  async getDailyEarned(userId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(today + 'T00:00:00.000Z');
    const entries = await this.ledgerModel.find({
      userId,
      amount: { $gt: 0 },
      createdAt: { $gte: startOfDay },
    });
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }

  async awardTaskPointsScaled(userId: string, submissionId: string, task: any, scaledBasePoints: number): Promise<number> {
    const dailyEarned = await this.getDailyEarned(userId);
    if (dailyEarned >= DAILY_CAP) return 0;

    const streak = await this.streaksService.getStreak(userId);
    const multiplier = this.streaksService.getMultiplier(streak.currentStreak);
    let points = Math.round(scaledBasePoints * multiplier);
    points = Math.min(points, DAILY_CAP - dailyEarned);

    await this.addEntry(userId, LedgerEventType.TASK_COMPLETION, points, submissionId,
      `Completed: ${task.title}`);

    return points;
  }

  async awardTaskPoints(userId: string, submissionId: string, task: any): Promise<number> {
    const dailyEarned = await this.getDailyEarned(userId);
    if (dailyEarned >= DAILY_CAP) return 0;

    const streak = await this.streaksService.getStreak(userId);
    const multiplier = this.streaksService.getMultiplier(streak.currentStreak);
    let points = Math.round(task.basePoints * multiplier);
    points = Math.min(points, DAILY_CAP - dailyEarned);

    await this.addEntry(userId, LedgerEventType.TASK_COMPLETION, points, submissionId,
      `Completed: ${task.title}`);

    // First category completion bonus
    const categoryEntries = await this.ledgerModel.find({ userId, eventType: LedgerEventType.FIRST_CATEGORY_BONUS });
    const hasCategoryBonus = categoryEntries.some(e => e.description.includes(task.category));
    if (!hasCategoryBonus) {
      const bonus = Math.min(100, DAILY_CAP - dailyEarned - points);
      if (bonus > 0) {
        await this.addEntry(userId, LedgerEventType.FIRST_CATEGORY_BONUS, bonus, null,
          `First ${task.category} task bonus!`);
        points += bonus;
      }
    }

    return points;
  }

  async awardMilestoneBonus(userId: string, milestone: number, bonusPoints: number) {
    await this.addEntry(userId, LedgerEventType.STREAK_MILESTONE, bonusPoints, null,
      `${milestone}-day streak milestone!`);
  }

  private async addEntry(
    userId: string,
    eventType: LedgerEventType,
    amount: number,
    taskSubmissionId: string | null,
    description: string,
  ) {
    return this.ledgerModel.create({ userId, eventType, amount, taskSubmissionId, description });
  }
}
