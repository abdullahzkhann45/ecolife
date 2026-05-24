import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskSubmission, TaskSubmissionDocument, SubmissionStatus } from '../tasks/task-submission.schema';
import { Task, TaskDocument, TaskCategory } from '../tasks/task.schema';
import { OnboardingResponse, OnboardingResponseDocument } from '../onboarding/onboarding-response.schema';
import { TaskCommitment, TaskCommitmentDocument } from '../tasks/task-commitment.schema';

const ALL_CATEGORIES = [
  TaskCategory.TRANSPORT, TaskCategory.DIET, TaskCategory.ENERGY,
  TaskCategory.WATER, TaskCategory.WASTE, TaskCategory.CONSUMPTION,
];

@Injectable()
export class EcoScoreService {
  constructor(
    @InjectModel(TaskSubmission.name) private submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(OnboardingResponse.name) private onboardingModel: Model<OnboardingResponseDocument>,
    @InjectModel(TaskCommitment.name) private commitmentModel: Model<TaskCommitmentDocument>,
  ) {}

  async getScore(userId: string) {
    const onboarding = await this.onboardingModel.findOne({ userId });
    const baseline = onboarding?.baselineScore ?? 400;
    const categoryScoresRaw = onboarding?.categoryScores ? JSON.parse(onboarding.categoryScores) : {};

    const baselineComponent = Math.round((baseline / 1000) * 300);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const submissions = await this.submissionModel.find({ userId, status: SubmissionStatus.APPROVED });
    const recent = submissions.filter(s => s.verifiedAt && s.verifiedAt > thirtyDaysAgo);

    const categoryPoints: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) categoryPoints[cat] = 0;

    for (const sub of recent) {
      const task = await this.taskModel.findById(sub.taskId);
      if (task) categoryPoints[task.category] = (categoryPoints[task.category] || 0) + (sub.pointsAwarded || task.basePoints);
    }

    const expectedMax = 300;
    let activitySum = 0;
    for (const cat of ALL_CATEGORIES) {
      activitySum += Math.min(100, (categoryPoints[cat] / expectedMax) * 100);
    }
    const activityComponent = Math.round((activitySum / ALL_CATEGORIES.length) * 5);
    const activityCapped = Math.min(500, activityComponent);

    const commitments = await this.commitmentModel.find({ userId, isActive: true });
    let commitmentComponent = 0;
    let activityWeight = 500;

    if (commitments.length > 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const recentSubs = submissions.filter(s => s.verifiedAt && s.verifiedAt > sevenDaysAgo);
      const committedIds = new Set(commitments.map(c => c.taskId.toString()));

      const dayCompletions: Record<string, { done: number; total: number }> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        dayCompletions[d] = { done: 0, total: commitments.length };
      }
      for (const sub of recentSubs) {
        if (committedIds.has(sub.taskId.toString())) {
          const d = sub.verifiedAt!.toISOString().slice(0, 10);
          if (dayCompletions[d]) dayCompletions[d].done++;
        }
      }
      const rates = Object.values(dayCompletions).map(d => d.total > 0 ? d.done / d.total : 0);
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
      commitmentComponent = Math.round(avgRate * 200);
      activityWeight = 500;
    } else {
      activityWeight = 700;
      commitmentComponent = 0;
    }

    const finalActivity = Math.min(activityWeight, Math.round(activityCapped * (activityWeight / 500)));
    const currentScore = Math.min(1000, baselineComponent + finalActivity + commitmentComponent);

    const categoryBreakdown: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      const baselinePart = (categoryScoresRaw[cat] ?? 50) * 5;
      const activityPart = Math.min(500, Math.round((categoryPoints[cat] / expectedMax) * 500));
      categoryBreakdown[cat] = Math.min(1000, baselinePart + activityPart);
    }

    return {
      currentScore,
      baselineScore: baseline,
      improvement: currentScore - baseline,
      categoryBreakdown,
      tasksCompletedLast30Days: recent.length,
      components: { baseline: baselineComponent, activity: finalActivity, commitment: commitmentComponent },
      methodology: 'Score = Baseline (30%) + Activity (50%) + Commitment (20%). Rolling 30-day window. Pakistan-weighted categories. Scale: 0-1000.',
    };
  }
}
