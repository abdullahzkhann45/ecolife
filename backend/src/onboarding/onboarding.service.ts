import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingResponse, OnboardingResponseDocument } from './onboarding-response.schema';
import { User, UserDocument } from '../users/user.schema';
import { Task, TaskDocument } from '../tasks/task.schema';
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

    const starterTasks = await this.getStarterTasks(lifestyleType);

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

  private async getStarterTasks(lifestyleType: string) {
    const tasks = await this.taskModel.find({ isActive: true });

    const matched = tasks.filter(t => {
      if (!t.lifestyleTypes) return true;
      try {
        const types: string[] = JSON.parse(t.lifestyleTypes);
        return types.includes(lifestyleType) || types.includes('all');
      } catch {
        return true;
      }
    });

    const categories = Object.keys(CATEGORY_WEIGHTS);
    const selected: any[] = [];
    for (const cat of categories) {
      const catTasks = matched.filter(t => t.category === cat);
      if (catTasks.length > 0) {
        selected.push(catTasks[0]);
        if (catTasks.length > 1) selected.push(catTasks[1]);
      }
    }
    return selected.slice(0, 8);
  }
}
