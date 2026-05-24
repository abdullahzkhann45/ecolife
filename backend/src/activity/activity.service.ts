import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailySnapshot, DailySnapshotDocument } from './daily-snapshot.schema';
import { EcoScoreService } from '../eco-score/eco-score.service';
import { TasksService } from '../tasks/tasks.service';
import { StreaksService } from '../streaks/streaks.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(DailySnapshot.name) private snapshotModel: Model<DailySnapshotDocument>,
    private ecoScoreService: EcoScoreService,
    private tasksService: TasksService,
    private streaksService: StreaksService,
    private pointsService: PointsService,
  ) {}

  async recordDailySnapshot(userId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [score, progress, streak, points] = await Promise.all([
      this.ecoScoreService.getScore(userId),
      this.tasksService.getCommitmentProgress(userId),
      this.streaksService.getStreak(userId),
      this.pointsService.getDailyEarned(userId),
    ]);

    const data = {
      userId, date: today,
      ecoScore: score.currentScore,
      tasksCompleted: progress.tasksCompletedToday,
      tasksCommitted: progress.tasksCommitted,
      completionRate: progress.completionRate,
      pointsEarned: points,
      currentStreak: streak.currentStreak,
      categoryBreakdown: JSON.stringify(score.categoryBreakdown),
    };

    const snapshot = await this.snapshotModel.findOneAndUpdate(
      { userId, date: today },
      { $set: data },
      { upsert: true, new: true },
    );

    return snapshot;
  }

  async getHistory(userId: string, start: string, end: string) {
    await this.recordDailySnapshot(userId);
    return this.snapshotModel.find({
      userId, date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
  }

  async generateCSV(userId: string, start: string, end: string): Promise<string> {
    const history = await this.getHistory(userId, start, end);
    const header = 'Date,EcoScore,TasksCompleted,TasksCommitted,CompletionRate,PointsEarned,Streak\n';
    const rows = history.map(s =>
      `${s.date},${s.ecoScore},${s.tasksCompleted},${s.tasksCommitted},${(s.completionRate * 100).toFixed(0)}%,${s.pointsEarned},${s.currentStreak}`
    ).join('\n');
    return header + rows;
  }
}
