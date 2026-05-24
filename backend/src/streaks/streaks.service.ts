import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Streak, StreakDocument } from './streak.schema';

const MILESTONE_STREAKS = [7, 14, 30, 60, 100, 365];
const MILESTONE_BONUS = { 7: 100, 14: 200, 30: 500, 60: 800, 100: 1500, 365: 5000 };

@Injectable()
export class StreaksService {
  constructor(
    @InjectModel(Streak.name) private streakModel: Model<StreakDocument>,
  ) {}

  async getStreak(userId: string) {
    let streak = await this.streakModel.findOne({ userId });
    if (!streak) {
      streak = await this.streakModel.create({ userId });
    }
    return streak;
  }

  async recordCompletion(userId: string): Promise<{ milestoneReached: number | null; bonusPoints: number }> {
    const streak = await this.getStreak(userId);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (streak.lastCompletedDate === today) {
      return { milestoneReached: null, bonusPoints: 0 };
    }

    if (streak.lastCompletedDate === yesterday || streak.currentStreak === 0) {
      streak.currentStreak += 1;
    } else {
      if (!streak.freezeUsedThisPeriod) {
        streak.freezeUsedThisPeriod = true;
        streak.currentStreak += 1;
      } else {
        streak.currentStreak = 1;
      }
    }

    streak.lastCompletedDate = today;
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    const freezeStart = streak.freezePeriodStart ? new Date(streak.freezePeriodStart) : null;
    if (!freezeStart || Date.now() - freezeStart.getTime() > 30 * 86400000) {
      streak.freezeUsedThisPeriod = false;
      streak.freezePeriodStart = today;
    }

    await streak.save();

    let milestoneReached: number | null = null;
    let bonusPoints = 0;
    if (MILESTONE_STREAKS.includes(streak.currentStreak)) {
      milestoneReached = streak.currentStreak;
      bonusPoints = MILESTONE_BONUS[streak.currentStreak] || 0;
    }

    return { milestoneReached, bonusPoints };
  }

  getMultiplier(currentStreak: number): number {
    if (currentStreak >= 100) return 1.5;
    if (currentStreak >= 30) return 1.25;
    if (currentStreak >= 7) return 1.1;
    return 1.0;
  }
}
