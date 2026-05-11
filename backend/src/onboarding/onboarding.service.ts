import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingResponse } from './onboarding-response.entity';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';

const QUESTIONS = [
  { id: 'transport', question: 'How do you usually commute?', options: ['Car (alone)', 'Carpool', 'Public transit', 'Bike/walk', 'Work from home'] },
  { id: 'diet', question: 'How would you describe your diet?', options: ['Meat-heavy', 'Balanced omnivore', 'Flexitarian', 'Vegetarian', 'Vegan'] },
  { id: 'energy', question: 'Do you use renewable energy at home?', options: ['No', 'Partially', 'Yes', 'Not sure'] },
  { id: 'waste', question: 'How often do you recycle?', options: ['Never', 'Sometimes', 'Usually', 'Always'] },
  { id: 'shopping', question: 'How often do you buy new clothes?', options: ['Weekly', 'Monthly', 'Seasonally', 'Rarely', 'Mostly second-hand'] },
  { id: 'goals', question: 'What is your main eco goal?', options: ['Reduce carbon footprint', 'Cut plastic waste', 'Eat more sustainably', 'Save energy', 'All of the above'] },
];

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingResponse)
    private responseRepo: Repository<OnboardingResponse>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
  ) {}

  getQuestions() {
    return QUESTIONS;
  }

  async submitAnswers(userId: string, answers: Record<string, string>) {
    const baselineScore = this.calculateBaselineScore(answers);

    let response = await this.responseRepo.findOne({ where: { userId } });
    if (response) {
      response.answers = JSON.stringify(answers);
      response.baselineScore = baselineScore;
    } else {
      response = this.responseRepo.create({
        userId,
        answers: JSON.stringify(answers),
        baselineScore,
      });
    }
    await this.responseRepo.save(response);
    await this.userRepo.update(userId, { onboardingCompleted: true });

    const starterTasks = await this.getStarterTasks(answers);

    return {
      baselineScore,
      categoryBreakdown: this.getCategoryBreakdown(answers),
      starterTasks,
    };
  }

  async getResponse(userId: string) {
    return this.responseRepo.findOne({ where: { userId } });
  }

  private calculateBaselineScore(answers: Record<string, string>): number {
    let score = 500;
    const scoring = {
      transport: { 'Car (alone)': -80, 'Carpool': -30, 'Public transit': 20, 'Bike/walk': 60, 'Work from home': 40 },
      diet: { 'Meat-heavy': -80, 'Balanced omnivore': -20, 'Flexitarian': 20, 'Vegetarian': 50, 'Vegan': 80 },
      energy: { 'No': -40, 'Partially': 0, 'Yes': 60, 'Not sure': -10 },
      waste: { 'Never': -40, 'Sometimes': 0, 'Usually': 30, 'Always': 50 },
      shopping: { 'Weekly': -50, 'Monthly': -20, 'Seasonally': 10, 'Rarely': 30, 'Mostly second-hand': 50 },
    };
    for (const [key, map] of Object.entries(scoring)) {
      if (answers[key] && map[answers[key]] !== undefined) score += map[answers[key]];
    }
    return Math.max(0, Math.min(1000, score));
  }

  private getCategoryBreakdown(answers: Record<string, string>) {
    return {
      transport: this.categoryScore('transport', answers),
      diet: this.categoryScore('diet', answers),
      energy: this.categoryScore('energy', answers),
      waste: this.categoryScore('waste', answers),
      consumption: this.categoryScore('shopping', answers),
    };
  }

  private categoryScore(key: string, answers: Record<string, string>): number {
    const maps = {
      transport: { 'Car (alone)': 100, 'Carpool': 250, 'Public transit': 550, 'Bike/walk': 900, 'Work from home': 700 },
      diet: { 'Meat-heavy': 100, 'Balanced omnivore': 350, 'Flexitarian': 550, 'Vegetarian': 750, 'Vegan': 900 },
      energy: { 'No': 200, 'Partially': 500, 'Yes': 900, 'Not sure': 400 },
      waste: { 'Never': 100, 'Sometimes': 400, 'Usually': 700, 'Always': 900 },
      shopping: { 'Weekly': 100, 'Monthly': 300, 'Seasonally': 600, 'Rarely': 800, 'Mostly second-hand': 950 },
    };
    return maps[key]?.[answers[key]] ?? 500;
  }

  private async getStarterTasks(answers: Record<string, string>) {
    const tasks = await this.taskRepo.find({ where: { isActive: true } });
    return tasks.slice(0, 7);
  }
}
