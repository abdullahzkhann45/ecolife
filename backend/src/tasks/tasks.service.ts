import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskCategory, VerificationMechanism } from './task.schema';
import { TaskSubmission, TaskSubmissionDocument, SubmissionStatus } from './task-submission.schema';
import { TaskCommitment, TaskCommitmentDocument } from './task-commitment.schema';
import { GpsSession, GpsSessionDocument } from './gps-session.schema';
import { UserProgress, UserProgressDocument, RANKS } from './user-progress.schema';
import { OnboardingResponse, OnboardingResponseDocument } from '../onboarding/onboarding-response.schema';
import { PointsService } from '../points/points.service';
import { StreaksService } from '../streaks/streaks.service';
import { GeminiVerifyService } from './gemini-verify.service';
import { GPSVerifyService } from './gps-verify.service';
import { GPSPoint, GPSVerdict, TaskTransportType } from './gps-pipeline.types';

const MAX_COMMITMENTS = 10;
const MAX_SELF_RATING_PER_DAY = 5;

// ── Each task has tags (who it's for) and difficulty (unlock level) baked in ──

interface SeedTask {
  title: string;
  description: string;
  category: TaskCategory;
  verificationMechanism: VerificationMechanism;
  selfRatingEnabled?: boolean;
  basePoints: number;
  co2SavedGrams?: number;
  waterSavedLiters?: number;
  wasteDivertedGrams?: number;
  proofInstructions: string;
  geminiPromptHint?: string;
  tags: string[];        // profile tags this task matches
  difficulty: number;    // 1=beginner, 2=intermediate, 3=advanced
  lifestyles: string[];  // lifestyle types this applies to ('all' = everyone)
}

export const SEED_TASKS: SeedTask[] = [
  // ── TRANSPORT ──
  {
    title: 'Walk or cycle for a short errand',
    description: 'Skip the bike/rickshaw for a nearby errand — walk or cycle instead. Start GPS tracking when you leave and stop when you arrive.',
    category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO,
    basePoints: 80, co2SavedGrams: 1200,
    proofInstructions: 'Start GPS tracking before you leave. Walk or cycle to your destination. Stop tracking when you arrive.',
    tags: ['drives_regularly', 'short_commute', 'market_shopper', 'car_owner'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Take the bus, Metro, or BRT',
    description: 'Use public transport instead of a private vehicle for your commute. Track your trip with GPS to verify.',
    category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO,
    basePoints: 100, co2SavedGrams: 1800,
    proofInstructions: 'Start GPS tracking when you board. The system will detect public transport speed patterns.',
    tags: ['drives_regularly', 'long_commute', 'urban', 'car_owner'],
    difficulty: 1, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'],
  },
  {
    title: 'Carpool or share a ride',
    description: 'Share your car, motorcycle, or rickshaw ride with someone going the same way.',
    category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO,
    basePoints: 90, co2SavedGrams: 1500,
    proofInstructions: 'Start GPS tracking during your shared ride.',
    tags: ['drives_regularly', 'long_commute', 'car_owner'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Use CNG instead of petrol today',
    description: 'If you drive, fill up with CNG instead of petrol — lower emissions, lower cost.',
    category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 70, co2SavedGrams: 900,
    proofInstructions: "Photo of the CNG station receipt or your car's CNG gauge.",
    geminiPromptHint: 'Look for a CNG pump, CNG station receipt, or a dashboard CNG gauge/switch. Pakistani CNG stations have distinctive green signage.',
    tags: ['drives_regularly', 'car_owner'],
    difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle'],
  },
  {
    title: 'Work or study from home today',
    description: 'Save fuel and emissions by staying home instead of commuting.',
    category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 60, co2SavedGrams: 2000,
    proofInstructions: 'Rate how fully you avoided commuting today.',
    tags: ['office_worker', 'student', 'long_commute'],
    difficulty: 1, lifestyles: ['urban_affluent', 'urban_middle'],
  },

  // ── DIET ──
  {
    title: 'Cook a daal/sabzi meal — no meat today',
    description: 'Make a fully plant-based meal: daal, sabzi, aloo, chana — skip the gosht.',
    category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 80, co2SavedGrams: 1500,
    proofInstructions: 'Photo of your plant-based meal on a plate or in a handi/pot.',
    geminiPromptHint: 'Look for a plate/bowl/handi with plant-based Pakistani food: daal, sabzi, aloo, chana, roti/naan. NO visible meat.',
    tags: ['meat_eater', 'cooks_at_home'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Shop at your local kirana or sabzi mandi',
    description: 'Buy fresh produce from a local kirana store or sabzi mandi — support local, skip packaging.',
    category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 120, co2SavedGrams: 800,
    proofInstructions: 'Photo of receipt showing kirana/mandi name, or wide shot of the market stall.',
    geminiPromptHint: 'Look for open-air market stalls, wooden crates of vegetables, thela, handwritten Urdu price signs, or a small kirana shop front.',
    tags: ['cooks_at_home', 'market_shopper', 'supermarket_shopper'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Make chai with a reusable cup — skip disposable',
    description: 'Use your own mug or cup for chai instead of a disposable plastic/paper cup.',
    category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 40, co2SavedGrams: 50, wasteDivertedGrams: 15,
    proofInstructions: 'Photo of your reusable cup/mug with chai.',
    geminiPromptHint: 'Look for a ceramic mug, steel cup, or glass cup with tea/chai. NOT a disposable cup.',
    tags: ['_universal'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Pack a homemade lunch instead of ordering',
    description: 'Take a packed dabba/lunch box to work or school instead of ordering food.',
    category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 70, co2SavedGrams: 600, wasteDivertedGrams: 100,
    proofInstructions: 'Photo of your packed lunch/dabba.',
    geminiPromptHint: 'Look for a lunch box (dabba), tiffin carrier, or food container with home-cooked food.',
    tags: ['orders_food', 'student', 'office_worker', 'cooks_at_home'],
    difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle'],
  },
  {
    title: 'Cook a fully plant-based dinner for the family',
    description: 'Make dinner for the whole family with zero meat — daal, sabzi, chana, aloo, or khichdi.',
    category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 100, co2SavedGrams: 2500,
    proofInstructions: 'Photo of the family dinner spread — all plant-based.',
    geminiPromptHint: 'Look for a dinner spread with multiple plant-based dishes. Should include items like daal, sabzi, roti, rice, raita. NO meat visible.',
    tags: ['meat_eater', 'cooks_at_home', 'family_home'],
    difficulty: 3, lifestyles: ['all'],
  },

  // ── ENERGY ──
  {
    title: 'Turn off AC/cooler for 2 hours during peak time',
    description: 'Give the grid a break — switch off cooling for 2 hours during peak electricity demand.',
    category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 60, co2SavedGrams: 800,
    proofInstructions: 'Rate how well you managed to reduce cooling usage today.',
    tags: ['uses_ac', 'uses_cooler'],
    difficulty: 1, lifestyles: ['urban_affluent', 'urban_middle'],
  },
  {
    title: 'Unplug UPS/chargers when not in load-shedding',
    description: 'UPS and phone chargers draw phantom power even when not needed. Unplug them.',
    category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 50, co2SavedGrams: 300,
    proofInstructions: 'Photo of unplugged UPS or chargers pulled out of sockets.',
    geminiPromptHint: 'Look for a UPS that is unplugged, or phone/laptop chargers pulled out of wall sockets.',
    tags: ['has_ups', 'urban', 'semi_urban'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Use natural light — keep lights off until Maghrib',
    description: 'Open curtains and use daylight instead of switching on lights during the day.',
    category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 40, co2SavedGrams: 200,
    proofInstructions: 'Rate how well you used natural light and avoided electric lights today.',
    tags: ['_universal'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Turn off geyser right after use',
    description: "Don't leave the geyser running all day — heat water only when needed.",
    category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 50, co2SavedGrams: 500,
    proofInstructions: 'Rate how consistently you turned off the geyser after use today.',
    tags: ['urban', 'family_home', 'semi_urban'],
    difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'],
  },
  {
    title: 'Dry clothes on the line instead of a dryer',
    description: 'Pakistan has plenty of sun — use a clothesline instead of a tumble dryer.',
    category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 45, co2SavedGrams: 2000,
    proofInstructions: 'Photo of clothes drying on a line or rooftop.',
    geminiPromptHint: 'Look for clothes hanging on a clothesline, rope, or railing — typically on a rooftop or balcony.',
    tags: ['_universal'],
    difficulty: 1, lifestyles: ['all'],
  },

  // ── WATER ──
  {
    title: 'Use a clay matka instead of electric water cooler',
    description: 'The traditional matka cools water with zero electricity — and tastes better too.',
    category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 70, co2SavedGrams: 400,
    proofInstructions: 'Photo of clay matka filled with water.',
    geminiPromptHint: 'Look for a distinctive round, porous tan/orange/brown clay pot (matka or gharra).',
    tags: ['buys_bottled_water', 'uses_water_cooler', 'family_home'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Refill a steel dabbah or glass bottle from filter',
    description: 'Skip buying mineral water bottles — refill your steel or glass bottle from a water filter.',
    category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 50, wasteDivertedGrams: 30,
    proofInstructions: 'Photo of steel dabbah or glass water bottle near a home water filter.',
    geminiPromptHint: 'Look for a stainless steel water bottle or glass bottle, near or being filled from a water filter.',
    tags: ['buys_bottled_water', 'urban', 'student'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Take a bucket bath instead of a shower',
    description: 'A bucket bath uses 15-20 liters vs 60+ for a shower. Traditional and effective.',
    category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 60, waterSavedLiters: 40,
    proofInstructions: 'Rate how consistently you used bucket baths instead of showers today.',
    tags: ['_universal'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Reuse wudu or kitchen water for plants',
    description: 'Collect water from wudu (ablution) or kitchen rinsing and use it to water plants.',
    category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 80, waterSavedLiters: 10,
    proofInstructions: 'Photo of watering plants with collected water.',
    geminiPromptHint: 'Look for a bucket or container collecting water, or someone pouring collected water onto plants.',
    tags: ['has_plants', 'garden', 'cooks_at_home', 'family_home'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Fix a leaky tap or report one in your building',
    description: 'A dripping tap wastes thousands of liters a year. Fix it or report it today.',
    category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 90, waterSavedLiters: 50,
    proofInstructions: 'Photo of fixed tap or maintenance request/complaint.',
    geminiPromptHint: 'Look for a fixed/repaired tap or a maintenance request form about a leaky tap.',
    tags: ['apartment', 'family_home', 'hostel'],
    difficulty: 2, lifestyles: ['all'],
  },

  // ── WASTE ──
  {
    title: 'Separate paper, plastic, and metal for kabari wala',
    description: 'Sort your recyclables into separate piles — the kabari wala will collect them.',
    category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 100, wasteDivertedGrams: 1000,
    proofInstructions: 'Photo of separated waste: cardboard pile, plastic bottles, metal items visibly divided.',
    geminiPromptHint: 'Look for visibly separated piles or bins of waste — cardboard/paper, plastic bottles, metal items.',
    tags: ['no_recycling', 'some_recycling', 'family_home'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Start a kitchen compost container',
    description: 'Put food scraps — peels, stale roti, chai leaves — into a pot for composting.',
    category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 120, wasteDivertedGrams: 500, co2SavedGrams: 300,
    proofInstructions: 'Photo of a clay pot or container with food scraps.',
    geminiPromptHint: 'Look for a container with food scraps — vegetable peels, fruit peels, stale roti, tea leaves.',
    tags: ['cooks_at_home', 'garden', 'already_recycles', 'some_recycling'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Pick up litter in your gali or street',
    description: 'Spend 10 minutes picking up trash in your neighborhood. Every piece counts.',
    category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 110, wasteDivertedGrams: 300,
    proofInstructions: 'Photo of the litter you collected, or before/after of the cleaned area.',
    geminiPromptHint: 'Look for collected trash/litter in a bag or pile, or a before/after comparison of a street.',
    tags: ['_universal'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Donate old clothes or items instead of trashing',
    description: 'Give usable clothes, toys, or household items to someone who needs them.',
    category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 80, wasteDivertedGrams: 2000,
    proofInstructions: 'Photo of donation bag, items being given away.',
    geminiPromptHint: 'Look for a bag or bundle of clothes/items being prepared for donation.',
    tags: ['frequent_shopper', 'family_home', 'mall_shopper'],
    difficulty: 2, lifestyles: ['all'],
  },
  {
    title: 'Refuse a plastic shopping bag — use your own',
    description: 'Say no to the plastic shopper at the store. Bring your own bag or carry items loose.',
    category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true,
    basePoints: 40, wasteDivertedGrams: 10,
    proofInstructions: 'Rate how consistently you refused plastic bags today.',
    tags: ['market_shopper', 'supermarket_shopper', 'frequent_shopper'],
    difficulty: 1, lifestyles: ['all'],
  },

  // ── CONSUMPTION ──
  {
    title: 'Carry a cloth thaila/jhola to the bazaar',
    description: 'Bring a reusable cloth bag for your groceries instead of taking plastic shoppers.',
    category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 60, wasteDivertedGrams: 15,
    proofInstructions: 'Photo of cloth bag filled with groceries.',
    geminiPromptHint: 'Look for a fabric/cloth bag (jhola/thaila) — NOT plastic.',
    tags: ['market_shopper', 'supermarket_shopper', 'cooks_at_home'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Switch to a traditional sabun bar (bar soap)',
    description: 'Replace liquid soap/body wash with a bar — less plastic packaging.',
    category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 45, wasteDivertedGrams: 50,
    proofInstructions: 'Photo of bar soap in your bathroom.',
    geminiPromptHint: 'Look for a rectangular soap bar on a shelf or dish in a bathroom.',
    tags: ['_universal'],
    difficulty: 1, lifestyles: ['all'],
  },
  {
    title: 'Buy from landa bazaar instead of new',
    description: 'Visit a landa bazaar (thrift market) for clothes or household items — reuse is best.',
    category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 100, co2SavedGrams: 5000,
    proofInstructions: 'Photo of your landa bazaar purchase or the market stall.',
    geminiPromptHint: 'Look for a landa bazaar — piles of used clothing on tables or ground, open-air stalls.',
    tags: ['frequent_shopper', 'mall_shopper', 'urban'],
    difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'],
  },
  {
    title: 'Repair something instead of replacing it',
    description: 'Fix a broken item — clothes, shoes, electronics, furniture — instead of buying new.',
    category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 130, co2SavedGrams: 3000,
    proofInstructions: 'Before and after photos of the repaired item.',
    geminiPromptHint: 'Look for evidence of repair — sewing, stitching, gluing, soldering.',
    tags: ['frequent_shopper', 'minimal_shopper', 'family_home'],
    difficulty: 3, lifestyles: ['all'],
  },
  {
    title: 'Plant or water one tree or plant today',
    description: 'Plant a new sapling or water an existing tree/plant. Every bit of green helps.',
    category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO,
    basePoints: 70, co2SavedGrams: 100,
    proofInstructions: 'Photo of newly planted sapling or plant being watered.',
    geminiPromptHint: 'Look for a sapling being planted or a plant/tree being watered.',
    tags: ['garden', 'rural', 'semi_urban', 'has_plants'],
    difficulty: 1, lifestyles: ['all'],
  },
];

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger('TasksService');

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(TaskSubmission.name) private submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel(TaskCommitment.name) private commitmentModel: Model<TaskCommitmentDocument>,
    @InjectModel(GpsSession.name) private gpsSessionModel: Model<GpsSessionDocument>,
    @InjectModel(UserProgress.name) private progressModel: Model<UserProgressDocument>,
    @InjectModel(OnboardingResponse.name) private onboardingModel: Model<OnboardingResponseDocument>,
    private pointsService: PointsService,
    private streaksService: StreaksService,
    private geminiVerify: GeminiVerifyService,
    private gpsVerify: GPSVerifyService,
  ) {}

  async onModuleInit() {
    const count = await this.taskModel.countDocuments();
    if (count === 0) {
      await this.taskModel.insertMany(SEED_TASKS.map(t => this.seedToDoc(t)));
      this.logger.log(`Seeded ${SEED_TASKS.length} tasks`);
    } else {
      // Force-sync tags/difficulty/lifestyles for every task on every startup
      await this.syncTaskTags();
    }
  }

  /** Overwrite taskTags, lifestyleTypes on existing DB rows so they're never null */
  private async syncTaskTags() {
    let synced = 0;
    for (const seed of SEED_TASKS) {
      const result = await this.taskModel.updateOne(
        { title: seed.title },
        { $set: {
          taskTags: JSON.stringify(seed.tags),
          lifestyleTypes: JSON.stringify(seed.lifestyles),
        }},
      );
      if (result.modifiedCount > 0) synced++;
    }
    if (synced > 0) this.logger.log(`Synced tags for ${synced} tasks`);
  }

  private seedToDoc(seed: SeedTask) {
    const { tags, difficulty, lifestyles, ...rest } = seed;
    return {
      ...rest,
      taskTags: JSON.stringify(tags),
      lifestyleTypes: JSON.stringify(lifestyles),
      isActive: true,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // CHAPTER-BASED TASK SYSTEM
  // ══════════════════════════════════════════════════════════════════

  static readonly DAYS_PER_CHAPTER = 5;
  static readonly TASKS_PER_DAY = 5;

  async getTodaysTasks(userId: string) {
    const progress = await this.getOrCreateProgress(userId);
    const pool = await this.getPersonalizedTaskPool(userId);

    // Generate chapter plan if not yet created
    if (!progress.chapterPlan) {
      progress.chapterPlan = JSON.stringify(this.generateChapterPlan(pool, userId, progress.currentChapter));
      progress.dayStartedAt = new Date();
      await progress.save();
    }

    const chapterPlan: string[][] = JSON.parse(progress.chapterPlan);
    const dayTaskIds = chapterPlan[progress.currentDay] || [];
    const completedIds = new Set<string>(JSON.parse(progress.dayCompletedTaskIds || '[]'));
    const chapterCompletedDays: number[] = JSON.parse(progress.chapterCompletedDays || '[]');

    // Resolve task documents for today's assigned tasks
    const allTasks = await this.taskModel.find({ isActive: true });
    const taskMap = new Map(allTasks.map(t => [t._id.toString(), t]));
    const commitments = await this.commitmentModel.find({ userId, isActive: true });
    const committedIds = new Set(commitments.map(c => c.taskId.toString()));

    const todayTasks = dayTaskIds
      .map(id => taskMap.get(id))
      .filter(Boolean)
      .map(t => ({
        ...t!.toObject(),
        id: t!._id.toString(),
        completedToday: completedIds.has(t!._id.toString()),
        committed: committedIds.has(t!._id.toString()),
      }));

    // Compute rank
    const rankInfo = RANKS[Math.min(progress.chaptersCompleted, RANKS.length - 1)];

    // Check if day is complete
    const dayComplete = dayTaskIds.length > 0 && dayTaskIds.every(id => completedIds.has(id));
    // Check if chapter is complete
    const chapterComplete = chapterCompletedDays.length >= TasksService.DAYS_PER_CHAPTER;

    return {
      chapter: progress.currentChapter + 1,      // 1-indexed for display
      chapterTitle: `Chapter ${progress.currentChapter + 1}`,
      day: progress.currentDay + 1,               // 1-indexed for display
      dayOf: TasksService.DAYS_PER_CHAPTER,
      dayComplete,
      chapterComplete,
      chaptersCompleted: progress.chaptersCompleted,
      rank: rankInfo,
      tasks: todayTasks,
      totalTasksToday: dayTaskIds.length,
      completedTasksToday: completedIds.size,
    };
  }

  /** After a task submission is approved, check if day/chapter should advance */
  private async checkAndAdvanceProgress(userId: string, taskId: string) {
    const progress = await this.progressModel.findOne({ userId });
    if (!progress || !progress.chapterPlan) return;

    const chapterPlan: string[][] = JSON.parse(progress.chapterPlan);
    const dayTaskIds = chapterPlan[progress.currentDay] || [];
    const completedIds: string[] = JSON.parse(progress.dayCompletedTaskIds || '[]');

    // Add this task if it's in today's plan
    if (dayTaskIds.includes(taskId) && !completedIds.includes(taskId)) {
      completedIds.push(taskId);
      progress.dayCompletedTaskIds = JSON.stringify(completedIds);
    }

    // Check if all day tasks are complete
    const dayComplete = dayTaskIds.length > 0 && dayTaskIds.every(id => completedIds.includes(id));
    if (dayComplete) {
      const chapterDays: number[] = JSON.parse(progress.chapterCompletedDays || '[]');
      if (!chapterDays.includes(progress.currentDay)) {
        chapterDays.push(progress.currentDay);
        progress.chapterCompletedDays = JSON.stringify(chapterDays);
      }

      // Check if entire chapter is done
      if (chapterDays.length >= TasksService.DAYS_PER_CHAPTER) {
        // Advance to next chapter
        progress.chaptersCompleted += 1;
        progress.currentChapter += 1;
        progress.currentDay = 0;
        progress.dayCompletedTaskIds = '[]';
        progress.chapterCompletedDays = '[]';
        // Generate next chapter plan
        const pool = await this.getPersonalizedTaskPool(userId);
        progress.chapterPlan = JSON.stringify(this.generateChapterPlan(pool, userId, progress.currentChapter));
        progress.dayStartedAt = new Date();
        this.logger.log(`User ${userId} completed Chapter ${progress.currentChapter}! Rank: ${RANKS[Math.min(progress.chaptersCompleted, RANKS.length - 1)].title}`);
      } else {
        // Advance to next day
        progress.currentDay += 1;
        progress.dayCompletedTaskIds = '[]';
        progress.dayStartedAt = new Date();
        this.logger.log(`User ${userId} completed Day ${progress.currentDay} of Chapter ${progress.currentChapter + 1}`);
      }
    }

    await progress.save();
  }

  /** Generate a 5-day plan from the user's task pool with no overlap */
  private generateChapterPlan(pool: TaskDocument[], userId: string, chapterNum: number): string[][] {
    const taskIds = pool.map(t => t._id.toString());

    // Deterministic shuffle based on userId + chapter number
    const seed = this.hash(`${userId}:chapter:${chapterNum}`);
    const shuffled = [...taskIds].sort((a, b) => this.hash(`${seed}:${a}`) - this.hash(`${seed}:${b}`));

    const days: string[][] = [];
    const perDay = TasksService.TASKS_PER_DAY;
    const totalDays = TasksService.DAYS_PER_CHAPTER;

    for (let d = 0; d < totalDays; d++) {
      const start = d * perDay;
      let dayTasks = shuffled.slice(start, start + perDay);

      // If we've exhausted the pool, wrap around with a different shuffle
      if (dayTasks.length < perDay) {
        const wrapSeed = this.hash(`${seed}:wrap:${d}`);
        const rewrapped = [...taskIds].sort((a, b) => this.hash(`${wrapSeed}:${a}`) - this.hash(`${wrapSeed}:${b}`));
        // Pick tasks not already used in THIS chapter
        const usedInChapter = new Set(days.flat());
        const available = rewrapped.filter(id => !usedInChapter.has(id));
        const extra = available.slice(0, perDay - dayTasks.length);
        dayTasks = dayTasks.concat(extra);

        // If still not enough (very small pool), allow repeats from earlier days
        if (dayTasks.length < perDay) {
          const fillers = rewrapped.filter(id => !dayTasks.includes(id)).slice(0, perDay - dayTasks.length);
          dayTasks = dayTasks.concat(fillers);
        }
      }

      days.push(dayTasks);
    }

    return days;
  }

  private async getOrCreateProgress(userId: string): Promise<UserProgressDocument> {
    let progress = await this.progressModel.findOne({ userId });
    if (!progress) {
      progress = await this.progressModel.create({ userId });
    }
    return progress;
  }

  /** Get user's current progress info (for profile/stats) */
  async getUserProgress(userId: string) {
    const progress = await this.getOrCreateProgress(userId);
    const rankInfo = RANKS[Math.min(progress.chaptersCompleted, RANKS.length - 1)];
    const nextRank = RANKS[Math.min(progress.chaptersCompleted + 1, RANKS.length - 1)];
    return {
      currentChapter: progress.currentChapter + 1,
      currentDay: progress.currentDay + 1,
      daysPerChapter: TasksService.DAYS_PER_CHAPTER,
      chaptersCompleted: progress.chaptersCompleted,
      rank: rankInfo,
      nextRank: rankInfo !== nextRank ? nextRank : null,
    };
  }

  async getPersonalizedTaskPool(userId: string) {
    const tasks = await this.taskModel.find({ isActive: true });
    const response = await this.onboardingModel.findOne({ userId });

    // No onboarding → return universal tasks only
    if (!response) {
      this.logger.debug(`No onboarding for user ${userId}, returning universal tasks`);
      return tasks.filter(t => {
        const tags = this.parseJsonArray(t.taskTags);
        return tags.includes('_universal');
      }).slice(0, 7);
    }

    const answers = this.safeParseObject(response.answers);
    const profile = this.buildTaskProfile(answers, response.lifestyleType);
    this.logger.debug(`User ${userId} profile: lifestyle=${profile.lifestyleType}, tags=[${[...profile.tags].join(',')}]`);

    // Get completed task counts per category for difficulty unlock
    const completed = await this.submissionModel.find({ userId, status: SubmissionStatus.APPROVED });
    const completedByCategory = new Map<string, number>();
    for (const sub of completed) {
      const task = tasks.find(t => t._id.toString() === sub.taskId.toString());
      if (task) completedByCategory.set(task.category, (completedByCategory.get(task.category) || 0) + 1);
    }

    const matched: TaskDocument[] = [];
    const universal: TaskDocument[] = [];

    for (const task of tasks) {
      const taskLifestyles = this.parseJsonArray(task.lifestyleTypes);
      const taskTags = this.parseJsonArray(task.taskTags);
      const seed = SEED_TASKS.find(s => s.title === task.title);
      const difficulty = seed?.difficulty || 1;

      // Check difficulty unlock: need 2 completed tasks per category per level
      const unlockedLevel = Math.min(3, 1 + Math.floor((completedByCategory.get(task.category) || 0) / 2));
      if (difficulty > unlockedLevel) continue;

      // Check lifestyle match
      const lifestyleOk = taskLifestyles.includes('all') || taskLifestyles.includes(profile.lifestyleType);
      if (!lifestyleOk) continue;

      // Universal tasks go to everyone
      if (taskTags.includes('_universal')) {
        universal.push(task);
        continue;
      }

      // Check tag match — at least one tag must match the user's profile
      const hasTagMatch = taskTags.some(tag => profile.tags.has(tag));
      if (hasTagMatch) {
        matched.push(task);
      }
    }

    this.logger.debug(`User ${userId}: ${matched.length} matched + ${universal.length} universal tasks`);

    // Combine: personalized first, then universal fill
    const pool = [...matched, ...universal];
    // Deduplicate
    const seen = new Set<string>();
    return pool.filter(t => {
      const id = t._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /**
   * Build a user's profile tags from their questionnaire answers.
   * These tags are matched against task tags to personalize the pool.
   */
  buildTaskProfile(answers: Record<string, string>, lifestyleType?: string | null) {
    const tags = new Set<string>();
    const add = (...items: string[]) => items.forEach(item => tags.add(item));
    const lifestyle = lifestyleType || 'urban_middle';

    // ── Location & Household ──
    if (['urban_affluent', 'urban_middle'].includes(lifestyle)) add('urban');
    if (lifestyle === 'semi_urban') add('semi_urban');
    if (lifestyle === 'rural') add('rural', 'garden');

    const household = answers.household || '';
    if (household.includes('Joint') || household.includes('Nuclear')) add('family_home');
    if (household.includes('Living alone')) add('apartment');
    if (household.includes('Hostel')) add('hostel', 'student');

    // ── Transport ──
    const transport = answers.transport_primary || '';
    if (transport.includes('Own car') || transport.includes('Motorcycle') || transport.includes('Rickshaw') || transport.includes('ride-hailing')) {
      add('drives_regularly');
    }
    if (transport.includes('Own car')) add('car_owner');
    if (transport.includes('Public bus') || transport.includes('Metro') || transport.includes('BRT') || transport.includes('Suzuki')) {
      add('public_transport_user');
    }
    if (transport.includes('Bicycle') || transport.includes('walking')) add('active_commuter');
    if (transport.includes('work/study from home')) add('office_worker');

    const distance = answers.transport_distance || '';
    if (distance.includes('Less than 3')) add('short_commute');
    if (distance.includes('10') || distance.includes('More than')) add('long_commute');

    // ── Diet & Kitchen ──
    const diet = answers.diet_type || '';
    if (diet.includes('Heavy meat') || diet.includes('Meat 3') || diet.includes('Trying to reduce')) {
      add('meat_eater');
    }

    const kitchen = answers.kitchen_habits || '';
    if (kitchen.includes('Home-cooked') || kitchen.includes('Mix of home cooking')) add('cooks_at_home');
    if (kitchen.includes('ordering') || kitchen.includes('eat out') || kitchen.includes('dhaba')) add('orders_food');
    if (kitchen.includes('Hostel mess') || kitchen.includes('canteen')) add('student');

    // ── Energy ──
    const energy = answers.energy_situation || '';
    if (energy.includes('UPS') || energy.includes('generator')) add('has_ups');

    const cooling = answers.cooling_method || '';
    if (cooling.includes('AC')) add('uses_ac');
    if (cooling.includes('cooler') || cooling.includes('Desert')) add('uses_cooler', 'uses_water_cooler');

    // ── Water ──
    const water = answers.water_source || '';
    if (water.includes('mineral water')) add('buys_bottled_water');
    if (water.includes('matka')) add('uses_matka');

    // ── Waste ──
    const waste = answers.waste_handling || '';
    if (waste.includes('Kabari')) add('already_recycles');
    if (waste.includes('occasionally')) add('some_recycling');
    if (waste.includes('one bin') || waste.includes('Municipal') || waste.includes('burn')) add('no_recycling');

    // ── Shopping ──
    const shopping = answers.shopping_habits || '';
    if (shopping.includes('Sabzi mandi') || shopping.includes('bazaar') || shopping.includes('kirana')) add('market_shopper');
    if (shopping.includes('supermarket') || shopping.includes('online')) add('supermarket_shopper', 'frequent_shopper');

    const consumption = answers.consumption_style || '';
    if (consumption.includes('Mall brands') || consumption.includes('online shopping')) add('mall_shopper', 'frequent_shopper');
    if (consumption.includes('keep things for years') || consumption.includes('landa')) add('minimal_shopper');

    // ── Derived ──
    if (tags.has('garden') || tags.has('family_home') || tags.has('rural')) add('has_plants');
    if (tags.has('student') || tags.has('hostel')) add('office_worker');

    return { lifestyleType: lifestyle, tags };
  }

  // pickDailyTasks removed — replaced by chapter-based generateChapterPlan

  // ══════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════

  private parseJsonArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private safeParseObject(value: string | null | undefined): Record<string, string> {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  /** FNV-1a hash — much better distribution than simple multiply-add */
  private hash(value: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0); // unsigned 32-bit
  }

  // ══════════════════════════════════════════════════════════════════
  // TASK CRUD & SUBMISSIONS
  // ══════════════════════════════════════════════════════════════════

  async getTaskById(id: string) {
    const task = await this.taskModel.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async submitTask(userId: string, taskId: string, proofData: any, photoBuffer?: Buffer, photoMimeType?: string, selfRating?: number) {
    const task = await this.getTaskById(taskId);

    if (task.selfRatingEnabled && selfRating !== undefined && selfRating !== null) {
      return this.handleSelfRatingSubmission(userId, task, selfRating);
    }

    const needsPhoto = [VerificationMechanism.PHOTO, VerificationMechanism.RECEIPT, VerificationMechanism.SENSOR]
      .includes(task.verificationMechanism);
    if (needsPhoto && !photoBuffer) {
      throw new BadRequestException('This task requires a photo for verification. Please upload a photo.');
    }

    const submission = await this.submissionModel.create({
      userId, taskId,
      proofUrl: proofData?.proofUrl || null,
      proofMetadata: JSON.stringify(proofData?.metadata || {}),
      status: SubmissionStatus.PENDING,
    });

    return this.verifySubmission(submission, task, userId, photoBuffer, photoMimeType);
  }

  private async handleSelfRatingSubmission(userId: string, task: TaskDocument, selfRating: number) {
    if (selfRating < 1 || selfRating > 5 || !Number.isInteger(selfRating)) {
      throw new BadRequestException('Self-rating must be an integer between 1 and 5.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(today + 'T00:00:00.000Z');
    const selfRatedToday = await this.submissionModel.countDocuments({
      userId, selfRating: { $ne: null }, status: SubmissionStatus.APPROVED, createdAt: { $gte: startOfDay },
    });
    if (selfRatedToday >= MAX_SELF_RATING_PER_DAY) {
      throw new BadRequestException(`You can only self-rate up to ${MAX_SELF_RATING_PER_DAY} tasks per day.`);
    }

    const pointsRatio = selfRating / 5;
    const scaledBasePoints = Math.round(task.basePoints * pointsRatio);

    const submission = await this.submissionModel.create({
      userId, taskId: task._id,
      selfRating, status: SubmissionStatus.APPROVED, verifiedAt: new Date(),
      proofMetadata: JSON.stringify({ selfRating, pointsRatio }),
    });

    const points = await this.pointsService.awardTaskPointsScaled(userId, submission._id.toString(), task, scaledBasePoints);
    submission.pointsAwarded = points;
    await submission.save();
    await this.streaksService.recordCompletion(userId);
    await this.checkAndAdvanceProgress(userId, task._id.toString());

    return {
      submission, status: SubmissionStatus.APPROVED, pointsAwarded: points,
      selfRating, aiConfidence: 100, rejectionReason: null,
    };
  }

  private async verifySubmission(submission: TaskSubmissionDocument, task: TaskDocument, userId: string, photoBuffer?: Buffer, photoMimeType?: string) {
    let newStatus = SubmissionStatus.APPROVED;
    let rejectionReason: string | null = null;
    let aiConfidence = 100;

    if (task.verificationMechanism === VerificationMechanism.SELF_ATTEST) {
      if (Math.random() < 0.05) {
        newStatus = SubmissionStatus.APPEALED;
        rejectionReason = 'Selected for random audit. Please provide photo evidence.';
      }
    } else if (task.verificationMechanism === VerificationMechanism.GEO) {
      newStatus = SubmissionStatus.APPROVED;
    } else if (photoBuffer && photoMimeType) {
      const imageBase64 = photoBuffer.toString('base64');
      const aiResult = await this.geminiVerify.verifyPhoto(imageBase64, photoMimeType, task);
      aiConfidence = aiResult.confidence;
      if (aiResult.approved) {
        newStatus = SubmissionStatus.APPROVED;
      } else {
        newStatus = SubmissionStatus.REJECTED;
        rejectionReason = aiResult.reason;
      }
      const existingMeta = JSON.parse(submission.proofMetadata || '{}');
      submission.proofMetadata = JSON.stringify({ ...existingMeta, aiVerification: { approved: aiResult.approved, confidence: aiResult.confidence, reason: aiResult.reason } });
    }

    submission.status = newStatus;
    submission.verifiedAt = new Date();
    submission.rejectionReason = rejectionReason;
    await submission.save();

    if (newStatus === SubmissionStatus.APPROVED) {
      const points = await this.pointsService.awardTaskPoints(userId, submission._id.toString(), task);
      submission.pointsAwarded = points;
      await submission.save();
      await this.streaksService.recordCompletion(userId);
      await this.checkAndAdvanceProgress(userId, task._id.toString());
    }

    return { submission, status: newStatus, pointsAwarded: submission.pointsAwarded || 0, aiConfidence, rejectionReason };
  }

  async appealSubmission(userId: string, submissionId: string) {
    const submission = await this.submissionModel.findOne({ _id: submissionId, userId });
    if (!submission) throw new NotFoundException('Submission not found');
    submission.status = SubmissionStatus.APPEALED;
    return submission.save();
  }

  async getUserSubmissions(userId: string) {
    return this.submissionModel.find({ userId }).populate('taskId').sort({ createdAt: -1 }).limit(50);
  }

  // ── GPS submission ──

  private _getTransportType(task: TaskDocument): TaskTransportType {
    const t = task.title.toLowerCase();
    if (t.includes('bus') || t.includes('metro') || t.includes('brt')) return 'public_transport';
    if (t.includes('carpool') || t.includes('share a ride')) return 'carpool';
    if (t.includes('cycle') || t.includes('cycling')) return 'cycling';
    return 'walking';
  }

  async handleGPSSubmission(userId: string, taskId: string, trail: GPSPoint[], hasPhoto: boolean) {
    const task = await this.getTaskById(taskId);

    if (task.category !== TaskCategory.TRANSPORT) {
      throw new BadRequestException('GPS verification is only available for transport tasks.');
    }

    const taskType = this._getTransportType(task);
    const verdict = this.gpsVerify.verify(trail, taskType, hasPhoto);

    let status: SubmissionStatus;
    if (verdict.approved && verdict.needsManualReview) {
      status = SubmissionStatus.MANUAL_REVIEW;
    } else if (verdict.approved) {
      status = SubmissionStatus.APPROVED;
    } else {
      status = SubmissionStatus.REJECTED;
    }

    if (verdict.needsPhoto && !hasPhoto && !verdict.approved) {
      return { requiresPhoto: true, verdict, status: 'needs_photo', pointsAwarded: 0, rejectionReason: verdict.rejectionReason };
    }

    const submission = await this.submissionModel.create({
      userId, taskId, status, verifiedAt: new Date(), rejectionReason: verdict.rejectionReason,
      proofMetadata: JSON.stringify({ gpsVerdict: verdict, trailSummary: { pointCount: trail.length, startTime: trail[0]?.timestamp, endTime: trail[trail.length - 1]?.timestamp } }),
    });

    if (verdict.approved) {
      const distanceFactor = Math.min(1, verdict.distanceKm / 2);
      const scaledPoints = Math.round(task.basePoints * distanceFactor * verdict.pointsMultiplier);
      const points = await this.pointsService.awardTaskPointsScaled(userId, submission._id.toString(), task, scaledPoints);
      submission.pointsAwarded = points;
      await submission.save();
      await this.streaksService.recordCompletion(userId);
      await this.checkAndAdvanceProgress(userId, task._id.toString());
    }

    await this.gpsSessionModel.create({
      userId, submissionId: submission._id,
      rawTrail: JSON.stringify(trail), summary: JSON.stringify(verdict),
      pointCount: trail.length, distanceMeters: verdict.distanceMeters,
      durationSeconds: verdict.durationSeconds, avgSpeedKmh: verdict.avgSpeedKmh,
      maxSpeedKmh: verdict.maxSpeedKmh, mode: verdict.mode,
      verdict: verdict.approved ? (verdict.needsManualReview ? 'manual_review' : 'approved') : 'rejected',
      confidence: verdict.confidence, antiCheatFlags: JSON.stringify(verdict.flags),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });

    return {
      submission, verdict, status: submission.status,
      pointsAwarded: submission.pointsAwarded || 0, aiConfidence: verdict.confidence,
      rejectionReason: submission.rejectionReason, needsManualReview: verdict.needsManualReview, needsPhoto: verdict.needsPhoto,
    };
  }

  // ── Commitments ──

  async commitToTask(userId: string, taskId: string) {
    await this.getTaskById(taskId);
    const existing = await this.commitmentModel.findOne({ userId, taskId });
    if (existing) {
      if (existing.isActive) throw new BadRequestException('Already committed to this task.');
      existing.isActive = true;
      existing.committedAt = new Date();
      return existing.save();
    }

    const activeCount = await this.commitmentModel.countDocuments({ userId, isActive: true });
    if (activeCount >= MAX_COMMITMENTS) {
      throw new BadRequestException(`Maximum ${MAX_COMMITMENTS} active commitments allowed.`);
    }

    return this.commitmentModel.create({ userId, taskId, isActive: true });
  }

  async uncommitFromTask(userId: string, taskId: string) {
    const commitment = await this.commitmentModel.findOne({ userId, taskId, isActive: true });
    if (!commitment) throw new NotFoundException('Commitment not found.');
    commitment.isActive = false;
    return commitment.save();
  }

  async getCommitments(userId: string) {
    return this.commitmentModel.find({ userId, isActive: true }).populate('taskId');
  }

  async getCommitmentProgress(userId: string) {
    const commitments = await this.commitmentModel.find({ userId, isActive: true }).populate('taskId');
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(today + 'T00:00:00.000Z');
    const todaySubmissions = await this.submissionModel.find({ userId, status: SubmissionStatus.APPROVED, createdAt: { $gte: startOfDay } });
    const completedTodayIds = new Set(todaySubmissions.map(s => s.taskId.toString()));

    const committedTasks = commitments.map(c => ({
      taskId: ((c.taskId as any)?._id || c.taskId).toString(),
      title: (c.taskId as any)?.title,
      completedToday: completedTodayIds.has(((c.taskId as any)?._id || c.taskId).toString()),
    }));

    const tasksCommitted = commitments.length;
    const tasksCompletedToday = committedTasks.filter(t => t.completedToday).length;
    const completionRate = tasksCommitted > 0 ? tasksCompletedToday / tasksCommitted : 0;
    const projectedPointsPerDay = commitments.reduce((sum, c) => sum + ((c.taskId as any)?.basePoints || 0), 0);
    const projectedScoreImprovement = Math.min(200, Math.round((projectedPointsPerDay / 500) * 200));

    return { tasksCommitted, tasksCompletedToday, completionRate, projectedScoreImprovement, committedTasks };
  }
}
