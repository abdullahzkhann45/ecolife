import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSubmission, SubmissionStatus } from '../tasks/task-submission.entity';
import { Task, TaskCategory } from '../tasks/task.entity';
import { OnboardingResponse } from '../onboarding/onboarding-response.entity';

@Injectable()
export class EcoScoreService {
  constructor(
    @InjectRepository(TaskSubmission)
    private submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(OnboardingResponse)
    private onboardingRepo: Repository<OnboardingResponse>,
  ) {}

  async getScore(userId: string) {
    const onboarding = await this.onboardingRepo.findOne({ where: { userId } });
    const baseline = onboarding?.baselineScore ?? 400;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const submissions = await this.submissionRepo.find({ where: { userId, status: SubmissionStatus.APPROVED } });
    const recent = submissions.filter(s => s.verifiedAt && s.verifiedAt > thirtyDaysAgo);

    const categoryPoints: Record<string, number> = {
      [TaskCategory.TRANSPORT]: 0,
      [TaskCategory.DIET]: 0,
      [TaskCategory.ENERGY]: 0,
      [TaskCategory.WASTE]: 0,
      [TaskCategory.CONSUMPTION]: 0,
    };

    for (const sub of recent) {
      const task = await this.taskRepo.findOne({ where: { id: sub.taskId } });
      if (task) categoryPoints[task.category] += task.basePoints;
    }

    const totalEarned = Object.values(categoryPoints).reduce((a, b) => a + b, 0);
    const earnedScore = Math.min(600, totalEarned / 2);
    const currentScore = Math.min(1000, Math.round(baseline * 0.4 + earnedScore));

    const categoryBreakdown: Record<string, number> = {};
    const categoryMax = 500;
    for (const [cat, pts] of Object.entries(categoryPoints)) {
      categoryBreakdown[cat] = Math.min(1000, Math.round((pts / categoryMax) * 1000));
    }

    return {
      currentScore,
      baselineScore: baseline,
      improvement: currentScore - baseline,
      categoryBreakdown,
      tasksCompletedLast30Days: recent.length,
      methodology: 'Score uses a rolling 30-day window. Baseline from onboarding (40%) + task completions (60%). Scale: 0–1000.',
    };
  }
}
