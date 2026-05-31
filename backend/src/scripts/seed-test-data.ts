/**
 * Seed script: generates 10 fake Pakistani users with 14 days of realistic activity.
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed-test-data.ts
 */

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
import { SEED_TASKS } from '../tasks/tasks.service';

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

/** Convert SEED_TASKS to DB documents with tags baked in */
function seedToDbDocs() {
  return SEED_TASKS.map(seed => {
    const { tags, difficulty, lifestyles, ...rest } = seed;
    return {
      ...rest,
      taskTags: JSON.stringify(tags),
      lifestyleTypes: JSON.stringify(lifestyles),
      isActive: true,
    };
  });
}

function parseTags(task: any): string[] {
  try { return JSON.parse(task.taskTags || '[]'); } catch { return []; }
}

function parseLifestyles(task: any): string[] {
  try { return JSON.parse(task.lifestyleTypes || '["all"]'); } catch { return ['all']; }
}

function buildProfileTags(a: Record<string, string>, lifestyleType: string): Set<string> {
  const tags = new Set<string>();
  const add = (...items: string[]) => items.forEach(item => tags.add(item));

  if (['urban_affluent', 'urban_middle'].includes(lifestyleType)) add('urban');
  if (lifestyleType === 'semi_urban') add('semi_urban');
  if (lifestyleType === 'rural') add('rural', 'garden');

  if (a.household?.includes('Joint') || a.household?.includes('Nuclear')) add('family_home', 'has_plants');
  if (a.household?.includes('Hostel')) add('hostel', 'student');
  if (a.household?.includes('Living alone')) add('apartment');

  if (a.transport_primary?.includes('Own car') || a.transport_primary?.includes('Motorcycle') || a.transport_primary?.includes('Rickshaw') || a.transport_primary?.includes('ride-hailing')) add('drives_regularly');
  if (a.transport_primary?.includes('Own car')) add('car_owner');
  if (a.transport_primary?.includes('work/study from home')) add('office_worker');
  if (a.transport_distance?.includes('Less than 3')) add('short_commute');
  if (a.transport_distance?.includes('10') || a.transport_distance?.includes('More than')) add('long_commute');

  if (a.diet_type?.includes('Heavy meat') || a.diet_type?.includes('Meat 3') || a.diet_type?.includes('Trying to reduce')) add('meat_eater');
  if (a.kitchen_habits?.includes('Home-cooked') || a.kitchen_habits?.includes('Mix of home cooking')) add('cooks_at_home');
  if (a.kitchen_habits?.includes('ordering') || a.kitchen_habits?.includes('eat out') || a.kitchen_habits?.includes('dhaba')) add('orders_food');
  if (a.kitchen_habits?.includes('Hostel') || a.kitchen_habits?.includes('canteen')) add('student');

  if (a.energy_situation?.includes('UPS') || a.energy_situation?.includes('generator')) add('has_ups');
  if (a.cooling_method?.includes('AC')) add('uses_ac');
  if (a.cooling_method?.includes('cooler') || a.cooling_method?.includes('Desert')) add('uses_cooler', 'uses_water_cooler');
  if (a.water_source?.includes('mineral water')) add('buys_bottled_water');

  if (a.waste_handling?.includes('Kabari')) add('already_recycles');
  if (a.waste_handling?.includes('occasionally')) add('some_recycling');
  if (a.waste_handling?.includes('one bin') || a.waste_handling?.includes('Municipal') || a.waste_handling?.includes('burn')) add('no_recycling');

  if (a.shopping_habits?.includes('Sabzi mandi') || a.shopping_habits?.includes('bazaar') || a.shopping_habits?.includes('kirana')) add('market_shopper');
  if (a.shopping_habits?.includes('supermarket') || a.shopping_habits?.includes('online')) add('supermarket_shopper', 'frequent_shopper');
  if (a.consumption_style?.includes('Mall brands') || a.consumption_style?.includes('online shopping')) add('mall_shopper', 'frequent_shopper');
  if (a.consumption_style?.includes('keep things for years') || a.consumption_style?.includes('landa')) add('minimal_shopper');

  if (tags.has('student') || tags.has('hostel')) add('office_worker');
  if (tags.has('garden') || tags.has('family_home') || tags.has('rural')) add('has_plants');
  return tags;
}

function taskPoolFor(profileAnswers: Record<string, string>, lifestyleType: string, tasks: any[]) {
  const tags = buildProfileTags(profileAnswers, lifestyleType);
  const matched = tasks.filter(task => {
    const taskTags = parseTags(task);
    const lifestyles = parseLifestyles(task);
    const lifestyleOk = lifestyles.includes('all') || lifestyles.includes(lifestyleType);
    if (!lifestyleOk) return false;
    // Universal tasks always match
    if (taskTags.includes('_universal')) return true;
    // Otherwise need at least one tag match
    return taskTags.some(tag => tags.has(tag));
  });
  return matched;
}

// ── User Profiles ──

const profiles = [
  // 3 urban Lahore
  { username: 'ahmedlhr', label: 'Ahmed - Lahore architect, 28, drives car', completion: 0.85, targetStreak: 14,
    answers: answers({ area_type: 0, household: 1, transport_primary: 0, transport_distance: 2, diet_type: 1, kitchen_habits: 1, energy_situation: 2, cooling_method: 0, water_source: 0, waste_handling: 2, shopping_habits: 2, consumption_style: 2 }) },
  { username: 'fatimalhr', label: 'Fatima - Lahore teacher, 34, Metro commuter', completion: 0.62, targetStreak: 8,
    answers: answers({ area_type: 0, household: 0, transport_primary: 4, transport_distance: 1, diet_type: 2, kitchen_habits: 0, energy_situation: 0, cooling_method: 1, water_source: 0, waste_handling: 0, shopping_habits: 1, consumption_style: 1 }) },
  { username: 'hassanlhr', label: 'Hassan - Lahore shopkeeper, 42, motorcycle', completion: 0.45, targetStreak: 3,
    answers: answers({ area_type: 0, household: 0, transport_primary: 2, transport_distance: 1, diet_type: 0, kitchen_habits: 0, energy_situation: 0, cooling_method: 2, water_source: 1, waste_handling: 2, shopping_habits: 0, consumption_style: 1 }) },
  // 2 suburban
  { username: 'saraahmad', label: 'Sara - Faisalabad housewife, 30, eco-enthusiast', completion: 0.78, targetStreak: 12,
    answers: answers({ area_type: 1, household: 1, transport_primary: 3, transport_distance: 0, diet_type: 4, kitchen_habits: 0, energy_situation: 0, cooling_method: 2, water_source: 1, waste_handling: 1, shopping_habits: 1, consumption_style: 3 }) },
  { username: 'usmangujrat', label: 'Usman - Gujranwala factory owner, 45', completion: 0.52, targetStreak: 5,
    answers: answers({ area_type: 2, household: 0, transport_primary: 1, transport_distance: 1, diet_type: 1, kitchen_habits: 0, energy_situation: 4, cooling_method: 3, water_source: 1, waste_handling: 3, shopping_habits: 0, consumption_style: 1 }) },
  // 2 students
  { username: 'alilums', label: 'Ali - LUMS student, 21, eco-warrior', completion: 0.72, targetStreak: 10,
    answers: answers({ area_type: 0, household: 3, transport_primary: 5, transport_distance: 0, diet_type: 4, kitchen_habits: 3, energy_situation: 2, cooling_method: 1, water_source: 3, waste_handling: 2, shopping_habits: 3, consumption_style: 2 }) },
  { username: 'zainabist', label: 'Zainab - IST student, 20, casual user', completion: 0.38, targetStreak: 0,
    answers: answers({ area_type: 0, household: 3, transport_primary: 4, transport_distance: 1, diet_type: 2, kitchen_habits: 3, energy_situation: 0, cooling_method: 3, water_source: 0, waste_handling: 4, shopping_habits: 1, consumption_style: 0 }) },
  // 2 housewives
  { username: 'ayeshakhi', label: 'Ayesha - Karachi housewife, 38, power user', completion: 0.82, targetStreak: 14,
    answers: answers({ area_type: 0, household: 0, transport_primary: 3, transport_distance: 0, diet_type: 1, kitchen_habits: 0, energy_situation: 0, cooling_method: 4, water_source: 2, waste_handling: 0, shopping_habits: 0, consumption_style: 1 }) },
  { username: 'nasreenmul', label: 'Nasreen - Multan housewife, 50, traditional', completion: 0.55, targetStreak: 6,
    answers: answers({ area_type: 1, household: 0, transport_primary: 3, transport_distance: 0, diet_type: 0, kitchen_habits: 0, energy_situation: 0, cooling_method: 2, water_source: 4, waste_handling: 3, shopping_habits: 0, consumption_style: 1 }) },
  // 1 rural
  { username: 'ibrahimrural', label: 'Ibrahim - Punjab village farmer, 55', completion: 0.60, targetStreak: 7,
    answers: answers({ area_type: 3, household: 0, transport_primary: 2, transport_distance: 1, diet_type: 2, kitchen_habits: 0, energy_situation: 0, cooling_method: 3, water_source: 1, waste_handling: 3, shopping_habits: 0, consumption_style: 1 }) },
];

async function main() {
  loadEnv();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in backend/.env');

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected. Seeding test data...\n');

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

  // ── Clean existing test data ──
  const testEmails = profiles.map((_, i) => `testuser${i + 1}@ecolife.dev`);
  const existingUsers = await UserModel.find({ email: { $in: testEmails } });
  if (existingUsers.length > 0) {
    const ids = existingUsers.map((u: any) => u._id);
    console.log(`Cleaning ${ids.length} existing test users...`);
    await Promise.all([
      UserModel.deleteMany({ _id: { $in: ids } }),
      OnboardingModel.deleteMany({ userId: { $in: ids } }),
      SubmissionModel.deleteMany({ userId: { $in: ids } }),
      CommitmentModel.deleteMany({ userId: { $in: ids } }),
      StreakModel.deleteMany({ userId: { $in: ids } }),
      LedgerModel.deleteMany({ userId: { $in: ids } }),
      FriendshipModel.deleteMany({ $or: [{ requesterId: { $in: ids } }, { addresseeId: { $in: ids } }] }),
      InventoryModel.deleteMany({ userId: { $in: ids } }),
      SnapshotModel.deleteMany({ userId: { $in: ids } }),
    ]);
  }

  // ── Ensure tasks exist with tags ──
  if (await TaskModel.countDocuments() === 0) {
    await TaskModel.insertMany(seedToDbDocs());
    console.log(`Seeded ${SEED_TASKS.length} tasks`);
  } else {
    // Force-sync tags on existing tasks
    for (const seed of SEED_TASKS) {
      await TaskModel.updateOne({ title: seed.title }, { $set: { taskTags: JSON.stringify(seed.tags), lifestyleTypes: JSON.stringify(seed.lifestyles) } });
    }
    console.log('Synced task tags');
  }
  const tasks = await TaskModel.find({ isActive: true });

  // ── Ensure shop items exist ──
  if (await ShopModel.countDocuments() === 0) {
    await ShopModel.insertMany([
      { name: 'Leaf Badge', description: 'Profile badge.', type: ShopItemType.COSMETIC, price: 200, imageEmoji: '🍃', isActive: true },
      { name: 'Green Flame', description: 'Streak flame.', type: ShopItemType.COSMETIC, price: 500, imageEmoji: '🔥', isActive: true },
      { name: 'Streak Freeze', description: 'Protect streak.', type: ShopItemType.BOOSTER, price: 300, imageEmoji: '🧊', isActive: true },
    ]);
  }
  const shopItems = await ShopModel.find({ isActive: true });

  // ── Create users ──
  const passwordHash = await bcrypt.hash('TestUser123', 12);
  const createdUsers: any[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const email = `testuser${i + 1}@ecolife.dev`;
    const { baselineScore, categoryScores } = calculatePakistanBaseline(p.answers);
    const lifestyleType = classifyLifestyle(p.answers);
    const pool = taskPoolFor(p.answers, lifestyleType, tasks);

    const user = await UserModel.create({
      email, username: p.username, passwordHash,
      timezone: 'Asia/Karachi', onboardingCompleted: true, lifestyleType,
      gpsConsentShown: true, createdAt: daysAgo(15), updatedAt: new Date(),
    });
    createdUsers.push(user);

    await OnboardingModel.create({
      userId: user._id.toString(), answers: JSON.stringify(p.answers),
      baselineScore, lifestyleType, categoryScores: JSON.stringify(categoryScores),
      completedAt: daysAgo(14), createdAt: daysAgo(14), updatedAt: daysAgo(14),
    });

    // ── 14 days of activity ──
    let runningPoints = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: string | null = null;

    for (let day = 13; day >= 0; day--) {
      const date = daysAgo(day, 8 + Math.floor(Math.random() * 10));
      const ds = dateKey(date);
      // Recent days more likely active for users with streaks
      const isActive = day < p.targetStreak ? true : Math.random() < p.completion;
      const completedCount = isActive ? Math.max(1, Math.round(1 + Math.random() * 3)) : 0;
      const dayTasks = [...pool].sort(() => Math.random() - 0.5).slice(0, completedCount);

      let dayPoints = 0, co2 = 0, water = 0, waste = 0;

      for (const task of dayTasks) {
        const partial = Math.random() < 0.15;
        const streakMult = 1 + Math.min(currentStreak, 30) * 0.02;
        const pts = Math.round((task.basePoints || 50) * (partial ? 0.5 : 1) * streakMult);
        const capped = Math.min(pts, 500 - dayPoints);
        if (capped <= 0) continue;

        const subDate = new Date(date); subDate.setMinutes(Math.floor(Math.random() * 60));
        const sub = await SubmissionModel.create({
          userId: user._id.toString(), taskId: task._id.toString(), status: SubmissionStatus.APPROVED,
          pointsAwarded: capped, selfRating: task.selfRatingEnabled ? (partial ? 3 : 5) : null,
          verifiedAt: subDate, proofMetadata: JSON.stringify({ seed: true }),
          createdAt: subDate, updatedAt: subDate,
        });
        await LedgerModel.create({
          userId: user._id.toString(), eventType: LedgerEventType.TASK_COMPLETION, amount: capped,
          taskSubmissionId: sub._id, description: `Completed: ${task.title}`,
          createdAt: subDate, updatedAt: subDate,
        });
        dayPoints += capped; co2 += task.co2SavedGrams || 0;
        water += task.waterSavedLiters || 0; waste += task.wasteDivertedGrams || 0;
      }

      runningPoints += dayPoints;
      if (isActive && completedCount > 0) { currentStreak++; lastCompletedDate = ds; }
      else { currentStreak = 0; }
      longestStreak = Math.max(longestStreak, currentStreak);

      // Milestone bonus
      if ([3, 7, 14].includes(currentStreak)) {
        const bonus = currentStreak === 3 ? 50 : currentStreak === 7 ? 150 : 500;
        await LedgerModel.create({ userId: user._id.toString(), eventType: LedgerEventType.STREAK_MILESTONE, amount: bonus, description: `${currentStreak}-day streak milestone!`, createdAt: date, updatedAt: date });
        runningPoints += bonus;
      }

      const ecoScore = Math.min(1000, Math.round(baselineScore * 0.3 + Math.min(500, runningPoints / 4) + currentStreak * 6));
      await SnapshotModel.create({
        userId: user._id.toString(), date: ds, ecoScore, tasksCompleted: completedCount,
        tasksCommitted: 4, completionRate: completedCount / 4, pointsEarned: dayPoints,
        currentStreak, co2SavedGrams: co2, waterSavedLiters: water, wasteDivertedGrams: waste,
        categoryBreakdown: JSON.stringify(categoryScores), createdAt: date, updatedAt: date,
      });
    }

    await StreakModel.create({
      userId: user._id.toString(), currentStreak, longestStreak,
      lastCompletedDate, freezeUsedThisPeriod: false,
    });

    // Commit to top 3-5 tasks
    const commitPool = pool.slice(0, Math.min(pool.length, 3 + (i % 3)));
    for (const task of commitPool) {
      try { await CommitmentModel.create({ userId: user._id.toString(), taskId: task._id.toString(), isActive: true, committedAt: daysAgo(10) }); } catch {}
    }

    console.log(`✓ ${email.padEnd(28)} ${p.label.padEnd(50)} streak=${currentStreak}/${longestStreak}  pts=${runningPoints}  pool=${pool.length} tasks`);
  }

  // ── Friendships ──
  const pairs = [[0, 1], [0, 3], [1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [7, 2]];
  for (const [a, b] of pairs) {
    await FriendshipModel.create({ requesterId: createdUsers[a]._id.toString(), addresseeId: createdUsers[b]._id.toString(), status: FriendshipStatus.ACCEPTED });
  }
  console.log(`\n✓ Created ${pairs.length} friendships`);

  // ── Shop purchases (users 0, 3, 5) ──
  for (const idx of [0, 3, 5]) {
    const user = createdUsers[idx];
    const item = shopItems[idx % shopItems.length];
    if (item) {
      await LedgerModel.create({ userId: user._id.toString(), eventType: LedgerEventType.PURCHASE, amount: -(item.price || 200), shopItemId: item._id, description: `Purchased: ${item.name}` });
      await InventoryModel.create({ userId: user._id.toString(), shopItemId: item._id.toString(), isEquipped: true, purchasedAt: daysAgo(3) });
      console.log(`✓ ${profiles[idx].username} bought ${item.name}`);
    }
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('Seed complete! Test accounts (password: TestUser123):');
  for (let i = 0; i < profiles.length; i++) {
    console.log(`  testuser${i + 1}@ecolife.dev  —  ${profiles[i].label}`);
  }
  console.log('══════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
