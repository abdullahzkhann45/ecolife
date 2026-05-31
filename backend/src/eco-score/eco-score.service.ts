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

const ACTIVITY_SHARE_OF_GROWTH = 0.7;
const COMMITMENT_SHARE_OF_GROWTH = 0.3;

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
    const activityPct = activitySum / ALL_CATEGORIES.length / 100;
    const remainingGrowth = Math.max(0, 1000 - baseline);
    const activityCap = Math.round(remainingGrowth * ACTIVITY_SHARE_OF_GROWTH);
    const commitmentCap = remainingGrowth - activityCap;
    const activityComponent = Math.min(activityCap, Math.round(activityPct * activityCap));

    const commitments = await this.commitmentModel.find({ userId, isActive: true });
    let commitmentComponent = 0;

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
      commitmentComponent = Math.min(commitmentCap, Math.round(avgRate * commitmentCap));
    }

    const currentScore = Math.min(1000, baseline + activityComponent + commitmentComponent);

    const categoryBreakdown: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      const categoryBaseline = (categoryScoresRaw[cat] ?? 50) * 10;
      const categoryGrowthRoom = Math.max(0, 1000 - categoryBaseline);
      const categoryActivityPct = Math.min(1, categoryPoints[cat] / expectedMax);
      const activityPart = Math.round(categoryActivityPct * categoryGrowthRoom);
      categoryBreakdown[cat] = Math.min(1000, categoryBaseline + activityPart);
    }

    return {
      currentScore,
      baselineScore: baseline,
      improvement: currentScore - baseline,
      categoryBreakdown,
      tasksCompletedLast30Days: recent.length,
      components: {
        baseline,
        activity: activityComponent,
        activityCap,
        commitment: commitmentComponent,
        commitmentCap,
        remainingPotential: Math.max(0, 1000 - currentScore),
      },
      methodology: 'Score = questionnaire baseline + verified improvement. Baseline is the starting 0-1000 score from Pakistan-weighted questionnaire answers. Activity can add 70% of the remaining growth potential from rolling 30-day verified task completions. Commitment can add 30% from 7-day committed-task consistency. The score never starts below baseline and is capped at 1000.',
    };
  }
}
