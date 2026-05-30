import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserSchema } from '../users/user.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { TaskSubmission, TaskSubmissionSchema, SubmissionStatus } from '../tasks/task-submission.schema';
import { Streak, StreakSchema } from '../streaks/streak.schema';
import { PointsLedger, PointsLedgerSchema, LedgerEventType } from '../points/points-ledger.schema';
import { Friendship, FriendshipSchema, FriendshipStatus } from '../friends/friendship.schema';
import { ShopItem, ShopItemSchema, ShopItemType } from '../shop/shop-item.schema';
import { Inventory, InventorySchema } from '../shop/inventory.schema';
import { OnboardingResponse, OnboardingResponseSchema } from '../onboarding/onboarding-response.schema';
import { DailySnapshot, DailySnapshotSchema } from '../activity/daily-snapshot.schema';
import { calculatePakistanBaseline, classifyLifestyle, PAKISTAN_QUESTIONS } from '../onboarding/pakistan-questionnaire';
import { SEED_TASKS, TASK_PERSONALIZATION } from '../tasks/tasks.service';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

function option(questionId: string, index: number) {
  const question = PAKISTAN_QUESTIONS.find(q => q.id === questionId);
  if (!question) throw new Error(`Question not found: ${questionId}`);
  return question.options[index];
}

function answers(indexes: Record<string, number>) {
  return Object.fromEntries(Object.entries(indexes).map(([id, idx]) => [id, option(id, idx)]));
}

function daysAgo(days: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function personalizeSeedTasks() {
  return SEED_TASKS.map((task: any) => {
    const normalized = task.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const match = Object.entries(TASK_PERSONALIZATION).find(([title]) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === normalized)?.[1];
    return match ? { ...task, taskTags: JSON.stringify(match.tags), lifestyleTypes: JSON.stringify(match.lifestyles || JSON.parse(task.lifestyleTypes || '["all"]')) } : task;
  });
}

const profiles = [
  { username: 'lahore-architect', profession: 'Architect', completion: 0.75, streak: 14, answers: answers({ area_type: 0, household: 1, transport_primary: 0, transport_distance: 2, diet_type: 1, kitchen_habits: 1, energy_situation: 2, cooling_method: 0, water_source: 0, waste_handling: 2, shopping_habits: 2, consumption_style: 2 }) },
  { username: 'lahore-teacher', profession: 'Teacher', completion: 0.62, streak: 8, answers: answers({ area_type: 0, household: 0, transport_primary: 4, transport_distance: 1, diet_type: 2, kitchen_habits: 0, energy_situation: 0, cooling_method: 1, water_source: 0, waste_handling: 1, shopping_habits: 1, consumption_style: 1 }) },
  { username: 'lahore-founder', profession: 'Startup founder', completion: 0.45, streak: 3, answers: answers({ area_type: 0, household: 2, transport_primary: 1, transport_distance: 3, diet_type: 0, kitchen_habits: 2, energy_situation: 2, cooling_method: 0, water_source: 3, waste_handling: 4, shopping_habits: 3, consumption_style: 2 }) },
  { username: 'suburban-family-1', profession: 'Suburban parent', completion: 0.68, streak: 10, answers: answers({ area_type: 2, household: 0, transport_primary: 2, transport_distance: 1, diet_type: 1, kitchen_habits: 0, energy_situation: 1, cooling_method: 2, water_source: 1, waste_handling: 0, shopping_habits: 0, consumption_style: 1 }) },
  { username: 'suburban-family-2', profession: 'Shop owner', completion: 0.52, streak: 5, answers: answers({ area_type: 2, household: 0, transport_primary: 3, transport_distance: 0, diet_type: 2, kitchen_habits: 0, energy_situation: 0, cooling_method: 3, water_source: 1, waste_handling: 1, shopping_habits: 1, consumption_style: 3 }) },
  { username: 'hostel-student-1', profession: 'Hostel student', completion: 0.58, streak: 6, answers: answers({ area_type: 0, household: 3, transport_primary: 5, transport_distance: 0, diet_type: 1, kitchen_habits: 3, energy_situation: 2, cooling_method: 3, water_source: 0, waste_handling: 4, shopping_habits: 1, consumption_style: 3 }) },
  { username: 'hostel-student-2', profession: 'Medical student', completion: 0.38, streak: 0, answers: answers({ area_type: 1, household: 3, transport_primary: 4, transport_distance: 1, diet_type: 0, kitchen_habits: 3, energy_situation: 0, cooling_method: 3, water_source: 3, waste_handling: 2, shopping_habits: 3, consumption_style: 2 }) },
  { username: 'home-manager-1', profession: 'Homemaker', completion: 0.82, streak: 14, answers: answers({ area_type: 0, household: 0, transport_primary: 6, transport_distance: 0, diet_type: 2, kitchen_habits: 0, energy_situation: 1, cooling_method: 1, water_source: 4, waste_handling: 0, shopping_habits: 0, consumption_style: 1 }) },
  { username: 'home-manager-2', profession: 'Homemaker', completion: 0.64, streak: 9, answers: answers({ area_type: 1, household: 0, transport_primary: 3, transport_distance: 0, diet_type: 1, kitchen_habits: 0, energy_situation: 0, cooling_method: 2, water_source: 1, waste_handling: 1, shopping_habits: 0, consumption_style: 3 }) },
  { username: 'rural-grower', profession: 'Rural farmer', completion: 0.7, streak: 11, answers: answers({ area_type: 3, household: 0, transport_primary: 2, transport_distance: 1, diet_type: 2, kitchen_habits: 0, energy_situation: 3, cooling_method: 3, water_source: 1, waste_handling: 3, shopping_habits: 0, consumption_style: 1 }) },
];

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in backend/.env');

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected. Seeding test data...');

  const UserModel = mongoose.model(User.name, UserSchema) as any;
  const TaskModel = mongoose.model(Task.name, TaskSchema) as any;
  const SubmissionModel = mongoose.model(TaskSubmission.name, TaskSubmissionSchema) as any;
  const StreakModel = mongoose.model(Streak.name, StreakSchema) as any;
  const LedgerModel = mongoose.model(PointsLedger.name, PointsLedgerSchema) as any;
  const FriendshipModel = mongoose.model(Friendship.name, FriendshipSchema) as any;
  const ShopModel = mongoose.model(ShopItem.name, ShopItemSchema) as any;
  const InventoryModel = mongoose.model(Inventory.name, InventorySchema) as any;
  const OnboardingModel = mongoose.model(OnboardingResponse.name, OnboardingResponseSchema) as any;
  const SnapshotModel = mongoose.model(DailySnapshot.name, DailySnapshotSchema) as any;

  const testEmails = profiles.map((_, i) => `testuser${i + 1}@ecolife.dev`);
  const existingUsers = await UserModel.find({ email: { $in: testEmails } });
  const existingIds = existingUsers.map(u => u._id);
  await Promise.all([
    UserModel.deleteMany({ _id: { $in: existingIds } }),
    OnboardingModel.deleteMany({ userId: { $in: existingIds } }),
    SubmissionModel.deleteMany({ userId: { $in: existingIds } }),
    StreakModel.deleteMany({ userId: { $in: existingIds } }),
    LedgerModel.deleteMany({ userId: { $in: existingIds } }),
    FriendshipModel.deleteMany({ $or: [{ requesterId: { $in: existingIds } }, { addresseeId: { $in: existingIds } }] }),
    InventoryModel.deleteMany({ userId: { $in: existingIds } }),
    SnapshotModel.deleteMany({ userId: { $in: existingIds } }),
  ]);

  if (await TaskModel.countDocuments() === 0) await TaskModel.insertMany(personalizeSeedTasks());
  const tasks = await TaskModel.find({ isActive: true });

  if (await ShopModel.countDocuments() === 0) {
    await ShopModel.insertMany([
      { name: 'Leaf Badge', description: 'A small profile badge for steady eco work.', type: ShopItemType.COSMETIC, price: 250, imageEmoji: 'leaf' },
      { name: 'Matka Theme', description: 'Warm clay colors for your profile.', type: ShopItemType.COSMETIC, price: 450, imageEmoji: 'matka' },
      { name: 'Streak Saver', description: 'A one-time streak protection item.', type: ShopItemType.BOOSTER, price: 600, imageEmoji: 'spark' },
    ]);
  }
  const shopItems = await ShopModel.find();

  const passwordHash = await bcrypt.hash('TestUser123', 10);
  const createdUsers: any[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const email = `testuser${i + 1}@ecolife.dev`;
    const { baselineScore, categoryScores } = calculatePakistanBaseline(p.answers);
    const lifestyleType = classifyLifestyle(p.answers);
    const user = await UserModel.create({
      email,
      username: p.username,
      passwordHash,
      timezone: 'Asia/Karachi',
      onboardingCompleted: true,
      lifestyleType,
      gpsConsentShown: i % 2 === 0,
      createdAt: daysAgo(15),
      updatedAt: new Date(),
    });
    createdUsers.push(user);

    await OnboardingModel.create({
      userId: user._id,
      answers: JSON.stringify(p.answers),
      baselineScore,
      lifestyleType,
      categoryScores: JSON.stringify(categoryScores),
      completedAt: daysAgo(14),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(14),
    });

    let runningPoints = 0;
    let currentStreak = 0;
    let longestStreak = 0;

    for (let day = 13; day >= 0; day--) {
      const date = daysAgo(day, 18);
      const dateString = dateKey(date);
      const activeDay = Math.random() < p.completion || day < p.streak;
      const completedCount = activeDay ? Math.max(1, Math.round(1 + Math.random() * 3)) : 0;
      const dayTasks = [...tasks].sort(() => Math.random() - 0.5).slice(0, completedCount);
      let dayPoints = 0;
      let co2 = 0;
      let water = 0;
      let waste = 0;

      for (const task of dayTasks) {
        const partial = Math.random() < 0.18;
        const points = Math.round((task.basePoints || 50) * (partial ? 0.5 : 1));
        dayPoints += points;
        co2 += task.co2SavedGrams || 0;
        water += task.waterSavedLiters || 0;
        waste += task.wasteDivertedGrams || 0;
        const submission = await SubmissionModel.create({
          userId: user._id,
          taskId: task._id,
          status: SubmissionStatus.APPROVED,
          pointsAwarded: points,
          selfRating: task.selfRatingEnabled ? (partial ? 3 : 5) : null,
          verifiedAt: date,
          proofMetadata: JSON.stringify({ seed: true, partial }),
          createdAt: date,
          updatedAt: date,
        });
        await LedgerModel.create({
          userId: user._id,
          eventType: LedgerEventType.TASK_COMPLETION,
          amount: points,
          taskSubmissionId: submission._id,
          description: `Completed ${task.title}`,
          createdAt: date,
          updatedAt: date,
        });
      }

      runningPoints += dayPoints;
      currentStreak = activeDay ? currentStreak + 1 : 0;
      longestStreak = Math.max(longestStreak, currentStreak);
      const ecoScore = Math.min(1000, Math.round(baselineScore * 0.3 + Math.min(500, runningPoints / 4) + currentStreak * 6));
      await SnapshotModel.create({
        userId: user._id,
        date: dateString,
        ecoScore,
        tasksCompleted: completedCount,
        tasksCommitted: 4 + (i % 4),
        completionRate: completedCount / (4 + (i % 4)),
        pointsEarned: dayPoints,
        currentStreak,
        co2SavedGrams: co2,
        waterSavedLiters: water,
        wasteDivertedGrams: waste,
        categoryBreakdown: JSON.stringify(categoryScores),
        createdAt: date,
        updatedAt: date,
      });
    }

    await StreakModel.create({
      userId: user._id,
      currentStreak: p.streak,
      longestStreak: Math.max(p.streak, longestStreak),
      lastCompletedDate: p.streak > 0 ? dateKey(new Date()) : dateKey(daysAgo(2)),
      freezeUsedThisPeriod: i % 4 === 0,
      freezePeriodStart: dateKey(daysAgo(7)),
    });

    if (i === 0 || i === 3 || i === 7) {
      const item = shopItems[i % shopItems.length];
      await InventoryModel.create({ userId: user._id, shopItemId: item._id, isEquipped: true, purchasedAt: daysAgo(3) });
      await LedgerModel.create({ userId: user._id, eventType: LedgerEventType.PURCHASE, amount: -item.price, shopItemId: item._id, description: `Purchased ${item.name}`, createdAt: daysAgo(3), updatedAt: daysAgo(3) });
    }
  }

  const pairs = [[0, 1], [0, 3], [1, 5], [2, 6], [3, 7], [4, 8], [5, 9]];
  for (const [a, b] of pairs) {
    await FriendshipModel.create({ requesterId: createdUsers[a]._id, addresseeId: createdUsers[b]._id, status: FriendshipStatus.ACCEPTED });
  }

  console.log('Seeded 10 realistic test users: testuser1@ecolife.dev ... testuser10@ecolife.dev');
  console.log('Password for all test users: TestUser123');
  await mongoose.disconnect();
}

main().catch(async err => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
