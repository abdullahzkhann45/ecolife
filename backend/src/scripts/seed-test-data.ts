import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserSchema } from '../users/user.schema';
import { Task, TaskSchema } from '../tasks/task.schema';
import { TaskSubmission, TaskSubmissionSchema, SubmissionStatus } from '../tasks/task-submission.schema';
import { TaskCommitment, TaskCommitmentSchema } from '../tasks/task-commitment.schema';
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

function parseTags(task: any) {
  try {
    return JSON.parse(task.taskTags || '["all"]');
  } catch {
    return ['all'];
  }
}

function buildProfileTags(profile: any, lifestyleType: string) {
  const tags = new Set<string>(['all']);
  const add = (...items: string[]) => items.forEach(item => tags.add(item));
  if (['urban_affluent', 'urban_middle'].includes(lifestyleType)) add('urban');
  if (lifestyleType === 'semi_urban') add('semi_urban');
  if (lifestyleType === 'rural') add('rural', 'garden');

  const a = profile.answers;
  if (a.household?.includes('Joint') || a.household?.includes('Nuclear')) add('family_home', 'has_plants');
  if (a.household?.includes('Hostel')) add('hostel', 'student');
  if (a.household?.includes('Living alone')) add('apartment');
  if (a.transport_primary?.includes('Own car') || a.transport_primary?.includes('Motorcycle') || a.transport_primary?.includes('Rickshaw')) add('drives_regularly');
  if (a.transport_primary?.includes('Own car')) add('car_owner');
  if (a.transport_distance?.includes('Less than 3')) add('short_commute');
  if (a.transport_distance?.includes('10') || a.transport_distance?.includes('More than')) add('long_commute');
  if (!a.diet_type?.includes('vegetarian') && !a.diet_type?.includes('Mostly daal')) add('meat_eater');
  if (a.kitchen_habits?.includes('Home-cooked') || a.kitchen_habits?.includes('Mix of home cooking')) add('cooks_at_home');
  if (a.kitchen_habits?.includes('ordering') || a.kitchen_habits?.includes('eat out') || a.kitchen_habits?.includes('dhaba')) add('orders_food');
  if (a.energy_situation?.includes('UPS')) add('has_ups');
  if (a.cooling_method?.includes('AC')) add('uses_ac');
  if (a.cooling_method?.includes('cooler')) add('uses_cooler', 'uses_water_cooler');
  if (a.water_source?.includes('mineral water')) add('buys_bottled_water');
  if (a.waste_handling?.includes('Kabari')) add('already_recycles');
  if (a.waste_handling?.includes('occasionally')) add('some_recycling');
  if (a.waste_handling?.includes('one bin') || a.waste_handling?.includes('Municipal') || a.waste_handling?.includes('burn')) add('no_recycling');
  if (a.shopping_habits?.includes('Sabzi mandi') || a.shopping_habits?.includes('bazaar') || a.shopping_habits?.includes('kirana')) add('market_shopper');
  if (a.shopping_habits?.includes('supermarket') || a.shopping_habits?.includes('online')) add('supermarket_shopper', 'frequent_shopper');
  if (a.consumption_style?.includes('Mall brands') || a.consumption_style?.includes('online shopping')) add('mall_shopper', 'frequent_shopper');
  if (a.consumption_style?.includes('keep things for years') || a.consumption_style?.includes('landa')) add('minimal_shopper');
  return tags;
}

function taskPoolFor(profile: any, lifestyleType: string, tasks: any[]) {
  const tags = buildProfileTags(profile, lifestyleType);
  const matched = tasks.filter(task => {
    const taskTags = parseTags(task);
    let lifestyles = ['all'];
    try { lifestyles = JSON.parse(task.lifestyleTypes || '["all"]'); } catch {}
    const lifestyleMatch = lifestyles.includes('all') || lifestyles.includes(lifestyleType);
    const tagMatch = !taskTags.includes('all') && taskTags.some((tag: string) => tags.has(tag));
    return lifestyleMatch && tagMatch;
  });
  return matched.length >= 7 ? matched : matched.concat(tasks.filter(t => parseTags(t).includes('all')));
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
  const CommitmentModel = mongoose.model(TaskCommitment.name, TaskCommitmentSchema) as any;
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
  const existingUserKeys = existingIds.concat(existingIds.map(id => id.toString()));
  await Promise.all([
    UserModel.deleteMany({ _id: { $in: existingIds } }),
    OnboardingModel.deleteMany({ userId: { $in: existingUserKeys } }),
    SubmissionModel.deleteMany({ userId: { $in: existingUserKeys } }),
    CommitmentModel.deleteMany({ userId: { $in: existingUserKeys } }),
    StreakModel.deleteMany({ userId: { $in: existingUserKeys } }),
    LedgerModel.deleteMany({ userId: { $in: existingUserKeys } }),
    FriendshipModel.deleteMany({ $or: [{ requesterId: { $in: existingUserKeys } }, { addresseeId: { $in: existingUserKeys } }] }),
    InventoryModel.deleteMany({ userId: { $in: existingUserKeys } }),
    SnapshotModel.deleteMany({ userId: { $in: existingUserKeys } }),
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
    const profileTasks = taskPoolFor(p, lifestyleType, tasks);
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

    const userId = user._id.toString();

    await OnboardingModel.create({
      userId,
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
      const dayTasks = [...profileTasks].sort(() => Math.random() - 0.5).slice(0, completedCount);
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
          userId,
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
          userId,
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
        userId,
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
      userId,
      currentStreak: p.streak,
      longestStreak: Math.max(p.streak, longestStreak),
      lastCompletedDate: p.streak > 0 ? dateKey(new Date()) : dateKey(daysAgo(2)),
      freezeUsedThisPeriod: i % 4 === 0,
      freezePeriodStart: dateKey(daysAgo(7)),
    });

    const commitments = profileTasks.slice(0, 6);
    for (const task of commitments) {
      await CommitmentModel.create({
        userId,
        taskId: task._id,
        isActive: true,
        committedAt: daysAgo(13),
      });
    }

    if (i === 0 || i === 3 || i === 7) {
      const item = shopItems[i % shopItems.length];
      await InventoryModel.create({ userId, shopItemId: item._id, isEquipped: true, purchasedAt: daysAgo(3) });
      await LedgerModel.create({ userId, eventType: LedgerEventType.PURCHASE, amount: -item.price, shopItemId: item._id, description: `Purchased ${item.name}`, createdAt: daysAgo(3), updatedAt: daysAgo(3) });
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
