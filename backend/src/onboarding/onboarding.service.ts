import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingResponse, OnboardingResponseDocument } from './onboarding-response.schema';
import { User, UserDocument } from '../users/user.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
import { TasksService } from '../tasks/tasks.service';
import {
  PAKISTAN_QUESTIONS,
  calculatePakistanBaseline,
  classifyLifestyle,
  CATEGORY_WEIGHTS,
} from './pakistan-questionnaire';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(OnboardingResponse.name) private responseModel: Model<OnboardingResponseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private tasksService: TasksService,
  ) {}

  getQuestions() {
    return PAKISTAN_QUESTIONS;
  }

  async submitAnswers(userId: string, answers: Record<string, string>) {
    const { baselineScore, categoryScores } = calculatePakistanBaseline(answers);
    const lifestyleType = classifyLifestyle(answers);

    let response = await this.responseModel.findOne({ userId });
    if (response) {
      response.answers = JSON.stringify(answers);
      response.baselineScore = baselineScore;
      response.lifestyleType = lifestyleType;
      response.categoryScores = JSON.stringify(categoryScores);
      await response.save();
    } else {
      response = await this.responseModel.create({
        userId,
        answers: JSON.stringify(answers),
        baselineScore,
        lifestyleType,
        categoryScores: JSON.stringify(categoryScores),
      });
    }

    await this.userModel.findByIdAndUpdate(userId, {
      onboardingCompleted: true,
      lifestyleType,
    });

    // Use the full personalization engine to pick starter tasks
    const starterTasks = await this.getStarterTasks(userId, answers, lifestyleType);

    return {
      baselineScore,
      lifestyleType,
      categoryBreakdown: this.buildCategoryBreakdown(categoryScores),
      starterTasks,
    };
  }

  async getResponse(userId: string) {
    return this.responseModel.findOne({ userId });
  }

  private buildCategoryBreakdown(categoryScores: Record<string, number>) {
    const breakdown: Record<string, number> = {};
    for (const [cat, score] of Object.entries(categoryScores)) {
      breakdown[cat] = Math.round(score * 10);
    }
    return breakdown;
  }

  private async getStarterTasks(userId: string, answers: Record<string, string>, lifestyleType: string) {
    const allTasks = await this.taskModel.find({ isActive: true });
    const profile = this.tasksService.buildTaskProfile(answers, lifestyleType);

    // Filter tasks that match user's profile (same logic as getPersonalizedTaskPool but without DB lookups for submissions)
    const matched: any[] = [];
    const universal: any[] = [];

    for (const task of allTasks) {
      const taskTags = this.parseJsonArray(task.taskTags);
      const taskLifestyles = this.parseJsonArray(task.lifestyleTypes);

      // Only show difficulty 1 tasks for new users
      const seed = (this.tasksService as any).constructor?.SEED_TASKS?.find?.((s: any) => s.title === task.title);
      // Use inline check: find in the exported SEED_TASKS
      const difficulty = this.getDifficulty(task.title);
      if (difficulty > 1) continue;

      // Check lifestyle match
      const lifestyleOk = taskLifestyles.includes('all') || taskLifestyles.includes(profile.lifestyleType);
      if (!lifestyleOk) continue;

      if (taskTags.includes('_universal')) {
        universal.push(task);
        continue;
      }

      const hasTagMatch = taskTags.some(tag => profile.tags.has(tag));
      if (hasTagMatch) matched.push(task);
    }

    // Pick 1 per category from matched, then fill with universal
    const categories = Object.keys(CATEGORY_WEIGHTS);
    const selected: any[] = [];
    for (const cat of categories) {
      const catTask = matched.find(t => t.category === cat);
      if (catTask) selected.push(catTask);
    }
    // Fill remaining with universal tasks not already selected
    const selectedIds = new Set(selected.map(t => t._id.toString()));
    for (const task of universal) {
      if (!selectedIds.has(task._id.toString())) {
        selected.push(task);
        selectedIds.add(task._id.toString());
      }
    }

    return selected.slice(0, 8);
  }

  private getDifficulty(title: string): number {
    // Import SEED_TASKS to get difficulty
    const { SEED_TASKS } = require('../tasks/tasks.service');
    const seed = SEED_TASKS.find((s: any) => s.title === title);
    return seed?.difficulty || 1;
  }

  private parseJsonArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
