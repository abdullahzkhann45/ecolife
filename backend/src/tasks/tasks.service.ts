import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument, TaskCategory, VerificationMechanism } from './task.schema';
import { TaskSubmission, TaskSubmissionDocument, SubmissionStatus } from './task-submission.schema';
import { TaskCommitment, TaskCommitmentDocument } from './task-commitment.schema';
import { GpsSession, GpsSessionDocument } from './gps-session.schema';
import { OnboardingResponse, OnboardingResponseDocument } from '../onboarding/onboarding-response.schema';
import { PointsService } from '../points/points.service';
import { StreaksService } from '../streaks/streaks.service';
import { GeminiVerifyService } from './gemini-verify.service';
import { GPSVerifyService } from './gps-verify.service';
import { GPSPoint, GPSVerdict, TaskTransportType } from './gps-pipeline.types';

const MAX_COMMITMENTS = 10;
const MAX_SELF_RATING_PER_DAY = 5;

export const SEED_TASKS = [
  // TRANSPORT (5)
  { title: 'Walk or cycle for a short errand', description: 'Skip the bike/rickshaw for a nearby errand — walk or cycle instead. Start GPS tracking when you leave and stop when you arrive.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO, selfRatingEnabled: false, basePoints: 80, co2SavedGrams: 1200, proofInstructions: 'Start GPS tracking before you leave. Walk or cycle to your destination. Stop tracking when you arrive. The system will verify your speed and distance.', lifestyleTypes: JSON.stringify(['all']) },
  { title: 'Take the bus, Metro, or BRT', description: 'Use public transport instead of a private vehicle for your commute. Track your trip with GPS to verify.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO, selfRatingEnabled: false, basePoints: 100, co2SavedGrams: 1800, proofInstructions: 'Start GPS tracking when you board. The system will detect public transport speed patterns and verify your trip distance.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle', 'semi_urban']) },
  { title: 'Carpool or share a ride', description: 'Share your car, motorcycle, or rickshaw ride with someone going the same way. Track the trip with GPS.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.GEO, selfRatingEnabled: false, basePoints: 90, co2SavedGrams: 1500, proofInstructions: 'Start GPS tracking during your shared ride. The system verifies the trip distance and awards points based on how far you carpooled.', lifestyleTypes: JSON.stringify(['all']) },
  { title: 'Use CNG instead of petrol today', description: 'If you drive, fill up with CNG instead of petrol — lower emissions, lower cost.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 70, co2SavedGrams: 900, proofInstructions: "Photo of the CNG station receipt or your car's CNG gauge.", lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle']), geminiPromptHint: 'Look for a CNG pump, CNG station receipt, or a dashboard CNG gauge/switch. Pakistani CNG stations have distinctive green signage.' },
  { title: 'Work or study from home today', description: 'Save fuel and emissions by staying home instead of commuting.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 60, co2SavedGrams: 2000, proofInstructions: 'Rate how fully you avoided commuting today.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle']) },
  // DIET (5)
  { title: 'Cook a daal/sabzi meal — no meat today', description: 'Make a fully plant-based meal: daal, sabzi, aloo, chana — skip the gosht.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 80, co2SavedGrams: 1500, proofInstructions: 'Photo of your plant-based meal on a plate or in a handi/pot.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a plate/bowl/handi with plant-based Pakistani food: daal (lentil curry — yellow/brown), sabzi (vegetable curry), aloo (potatoes), chana (chickpeas), roti/naan bread. NO visible meat (chicken, beef, mutton).' },
  { title: 'Shop at your local kirana or sabzi mandi', description: 'Buy fresh produce from a local kirana store or sabzi mandi — support local, skip packaging.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 120, co2SavedGrams: 800, proofInstructions: 'Photo of receipt showing kirana/mandi name, or wide shot of the market stall with fresh produce visible.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for open-air market stalls, tarpaulin displays, wooden crates of vegetables, thela (pushcart), handwritten Urdu price signs, or a small kirana shop front with produce.' },
  { title: 'Make chai with a reusable cup — skip disposable', description: 'Use your own mug or cup for chai instead of a disposable plastic/paper cup.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 40, co2SavedGrams: 50, wasteDivertedGrams: 15, proofInstructions: 'Photo of your reusable cup/mug with chai.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a ceramic mug, steel cup, or glass cup with tea/chai in it. Should NOT be a disposable plastic or paper cup.' },
  { title: 'Pack a homemade lunch instead of ordering', description: 'Take a packed dabba/lunch box to work or school instead of ordering food.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 70, co2SavedGrams: 600, wasteDivertedGrams: 100, proofInstructions: 'Photo of your packed lunch/dabba.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle']), geminiPromptHint: 'Look for a lunch box (dabba), tiffin carrier, or food container with home-cooked food.' },
  { title: 'Cook a fully plant-based dinner for the family', description: 'Make dinner for the whole family with zero meat — daal, sabzi, chana, aloo, or khichdi.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 100, co2SavedGrams: 2500, proofInstructions: 'Photo of the family dinner spread — all plant-based.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a dinner spread or dastarkhwan with multiple plant-based dishes. Should include items like daal, sabzi, roti, rice, raita, salad. NO meat visible.' },
  // ENERGY (5)
  { title: 'Turn off AC/cooler for 2 hours during peak time', description: 'Give the grid a break — switch off cooling for 2 hours during peak electricity demand.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 60, co2SavedGrams: 800, proofInstructions: 'Rate how well you managed to reduce cooling usage today.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle']) },
  { title: 'Unplug UPS/chargers when not in load-shedding', description: 'UPS and phone chargers draw phantom power even when not needed. Unplug them.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 50, co2SavedGrams: 300, proofInstructions: 'Photo of unplugged UPS or chargers pulled out of sockets.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a UPS that is unplugged, or phone/laptop chargers pulled out of wall sockets.' },
  { title: 'Use natural light — keep lights off until Maghrib', description: 'Open curtains and use daylight instead of switching on lights during the day.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 40, co2SavedGrams: 200, proofInstructions: 'Rate how well you used natural light and avoided electric lights today.', lifestyleTypes: JSON.stringify(['all']) },
  { title: 'Turn off geyser right after use', description: "Don't leave the geyser running all day — heat water only when needed.", category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 50, co2SavedGrams: 500, proofInstructions: 'Rate how consistently you turned off the geyser after use today.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle', 'semi_urban']) },
  { title: 'Dry clothes on the line instead of a dryer', description: 'Pakistan has plenty of sun — use a clothesline instead of a tumble dryer.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 45, co2SavedGrams: 2000, proofInstructions: 'Photo of clothes drying on a line or rooftop.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for clothes hanging on a clothesline, rope, or railing — typically on a rooftop or balcony.' },
  // WATER (5)
  { title: 'Use a clay matka instead of electric water cooler', description: 'The traditional matka cools water with zero electricity — and tastes better too.', category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 70, waterSavedLiters: 0, co2SavedGrams: 400, proofInstructions: 'Photo of clay matka filled with water.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a distinctive round, porous tan/orange/brown clay pot (matka or gharra).' },
  { title: 'Refill a steel dabbah or glass bottle from filter', description: 'Skip buying mineral water bottles — refill your steel or glass bottle from a water filter.', category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 50, wasteDivertedGrams: 30, proofInstructions: 'Photo of steel dabbah or glass water bottle being filled or sitting next to a home water filter.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a stainless steel water bottle/container or a glass bottle, near or being filled from a water filter.' },
  { title: 'Take a bucket bath instead of a shower', description: 'A bucket bath uses 15-20 liters vs 60+ for a shower. Traditional and effective.', category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 60, waterSavedLiters: 40, proofInstructions: 'Rate how consistently you used bucket baths instead of showers today.', lifestyleTypes: JSON.stringify(['all']) },
  { title: 'Reuse wudu or kitchen water for plants', description: 'Collect water from wudu (ablution) or kitchen rinsing and use it to water plants.', category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 80, waterSavedLiters: 10, proofInstructions: 'Photo of watering plants with collected water.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a bucket or container collecting water, or someone pouring collected water onto plants.' },
  { title: 'Fix a leaky tap or report one in your building', description: 'A dripping tap wastes thousands of liters a year. Fix it or report it today.', category: TaskCategory.WATER, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 90, waterSavedLiters: 50, proofInstructions: 'Photo of fixed tap or maintenance request/complaint.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a fixed/repaired tap or a maintenance request form about a leaky tap.' },
  // WASTE (5)
  { title: 'Separate paper, plastic, and metal for kabari wala', description: 'Sort your recyclables into separate piles — the kabari wala will collect them.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 100, wasteDivertedGrams: 1000, proofInstructions: 'Photo of separated waste: cardboard pile, plastic bottles, metal items visibly divided.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for visibly separated piles or bins of waste — cardboard/paper in one area, plastic bottles in another, metal/tin items distinct.' },
  { title: 'Start a kitchen compost container', description: 'Put food scraps — peels, stale roti, chai leaves — into a pot for composting.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 120, wasteDivertedGrams: 500, co2SavedGrams: 300, proofInstructions: 'Photo of a clay pot or container with food scraps.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a container with food scraps visible — vegetable peels, fruit peels, stale roti/bread, tea leaves.' },
  { title: 'Pick up litter in your gali or street', description: 'Spend 10 minutes picking up trash in your neighborhood. Every piece counts.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 110, wasteDivertedGrams: 300, proofInstructions: 'Photo of the litter you collected, or before/after of the cleaned area.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for collected trash/litter in a bag or pile, or a before/after comparison of a street.' },
  { title: 'Donate old clothes or items instead of trashing', description: 'Give usable clothes, toys, or household items to someone who needs them.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 80, wasteDivertedGrams: 2000, proofInstructions: 'Photo of donation bag, items being given away.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a bag or bundle of clothes/items being prepared for donation.' },
  { title: 'Refuse a plastic shopping bag — use your own', description: 'Say no to the plastic shopper at the store. Bring your own bag or carry items loose.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.SELF_ATTEST, selfRatingEnabled: true, basePoints: 40, wasteDivertedGrams: 10, proofInstructions: 'Rate how consistently you refused plastic bags today.', lifestyleTypes: JSON.stringify(['all']) },
  // CONSUMPTION (5)
  { title: 'Carry a cloth thaila/jhola to the bazaar', description: 'Bring a reusable cloth bag for your groceries instead of taking plastic shoppers.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 60, wasteDivertedGrams: 15, proofInstructions: 'Photo of cloth bag filled with groceries.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a fabric/cloth bag (jhola/thaila) — NOT plastic.' },
  { title: 'Switch to a traditional sabun bar (bar soap)', description: 'Replace liquid soap/body wash with a bar — less plastic packaging.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 45, wasteDivertedGrams: 50, proofInstructions: 'Photo of bar soap in your bathroom.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a rectangular soap bar on a shelf or dish in a bathroom.' },
  { title: 'Buy from landa bazaar instead of new', description: 'Visit a landa bazaar (thrift market) for clothes or household items — reuse is best.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 100, co2SavedGrams: 5000, proofInstructions: 'Photo of your landa bazaar purchase or the market stall.', lifestyleTypes: JSON.stringify(['urban_affluent', 'urban_middle', 'semi_urban']), geminiPromptHint: 'Look for a landa bazaar — piles of used clothing on tables or ground, open-air stalls.' },
  { title: 'Repair something instead of replacing it', description: 'Fix a broken item — clothes, shoes, electronics, furniture — instead of buying new.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 130, co2SavedGrams: 3000, proofInstructions: 'Before and after photos of the repaired item.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for evidence of repair — sewing, stitching, gluing, soldering.' },
  { title: 'Plant or water one tree or plant today', description: 'Plant a new sapling or water an existing tree/plant. Every bit of green helps.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 70, co2SavedGrams: 100, proofInstructions: 'Photo of newly planted sapling or plant being watered.', lifestyleTypes: JSON.stringify(['all']), geminiPromptHint: 'Look for a sapling being planted or a plant/tree being watered.' },
];

export const TASK_PERSONALIZATION: Record<string, { tags: string[]; difficulty: number; lifestyles?: string[] }> = {
  'Walk or cycle for a short errand': { tags: ['drives_regularly', 'short_commute', 'market_shopper'], difficulty: 1 },
  'Take the bus, Metro, or BRT': { tags: ['urban', 'long_commute', 'drives_regularly'], difficulty: 1, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'] },
  'Carpool or share a ride': { tags: ['drives_regularly', 'long_commute', 'urban'], difficulty: 2 },
  'Use CNG instead of petrol today': { tags: ['drives_regularly', 'car_owner'], difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle'] },
  'Work or study from home today': { tags: ['office_worker', 'student', 'long_commute'], difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle'] },
  'Cook a daal/sabzi meal — no meat today': { tags: ['meat_eater', 'cooks_at_home'], difficulty: 1 },
  'Shop at your local kirana or sabzi mandi': { tags: ['cooks_at_home', 'market_shopper', 'supermarket_shopper'], difficulty: 1 },
  'Make chai with a reusable cup — skip disposable': { tags: ['all'], difficulty: 1 },
  'Pack a homemade lunch instead of ordering': { tags: ['orders_food', 'student', 'office_worker', 'cooks_at_home'], difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle'] },
  'Cook a fully plant-based dinner for the family': { tags: ['meat_eater', 'cooks_at_home', 'family_home'], difficulty: 3 },
  'Turn off AC/cooler for 2 hours during peak time': { tags: ['uses_ac', 'uses_cooler'], difficulty: 1, lifestyles: ['urban_affluent', 'urban_middle'] },
  'Unplug UPS/chargers when not in load-shedding': { tags: ['has_ups', 'urban', 'semi_urban'], difficulty: 1 },
  'Use natural light — keep lights off until Maghrib': { tags: ['all'], difficulty: 1 },
  'Turn off geyser right after use': { tags: ['urban', 'family_home'], difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'] },
  'Dry clothes on the line instead of a dryer': { tags: ['family_home', 'apartment', 'rural'], difficulty: 1 },
  'Use a clay matka instead of electric water cooler': { tags: ['uses_water_cooler', 'buys_bottled_water', 'family_home'], difficulty: 2 },
  'Refill a steel dabbah or glass bottle from filter': { tags: ['buys_bottled_water', 'urban', 'student'], difficulty: 1 },
  'Take a bucket bath instead of a shower': { tags: ['all'], difficulty: 1 },
  'Reuse wudu or kitchen water for plants': { tags: ['has_plants', 'garden', 'cooks_at_home'], difficulty: 2 },
  'Fix a leaky tap or report one in your building': { tags: ['apartment', 'family_home', 'hostel'], difficulty: 2 },
  'Separate paper, plastic, and metal for kabari wala': { tags: ['no_recycling', 'some_recycling', 'family_home'], difficulty: 1 },
  'Start a kitchen compost container': { tags: ['cooks_at_home', 'garden', 'some_recycling', 'already_recycles'], difficulty: 2 },
  'Pick up litter in your gali or street': { tags: ['rural', 'semi_urban', 'no_recycling'], difficulty: 2 },
  'Donate old clothes or items instead of trashing': { tags: ['frequent_shopper', 'family_home'], difficulty: 2 },
  'Refuse a plastic shopping bag — use your own': { tags: ['market_shopper', 'supermarket_shopper', 'frequent_shopper'], difficulty: 1 },
  'Carry a cloth thaila/jhola to the bazaar': { tags: ['market_shopper', 'supermarket_shopper', 'cooks_at_home'], difficulty: 1 },
  'Switch to a traditional sabun bar (bar soap)': { tags: ['all'], difficulty: 1 },
  'Buy from landa bazaar instead of new': { tags: ['frequent_shopper', 'mall_shopper', 'urban'], difficulty: 2, lifestyles: ['urban_affluent', 'urban_middle', 'semi_urban'] },
  'Repair something instead of replacing it': { tags: ['frequent_shopper', 'minimal_shopper', 'family_home'], difficulty: 3 },
  'Plant or water one tree or plant today': { tags: ['garden', 'rural', 'semi_urban', 'has_plants'], difficulty: 1 },
};

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(TaskSubmission.name) private submissionModel: Model<TaskSubmissionDocument>,
    @InjectModel(TaskCommitment.name) private commitmentModel: Model<TaskCommitmentDocument>,
    @InjectModel(GpsSession.name) private gpsSessionModel: Model<GpsSessionDocument>,
    @InjectModel(OnboardingResponse.name) private onboardingModel: Model<OnboardingResponseDocument>,
    private pointsService: PointsService,
    private streaksService: StreaksService,
    private geminiVerify: GeminiVerifyService,
    private gpsVerify: GPSVerifyService,
  ) {}

  async onModuleInit() {
    const count = await this.taskModel.countDocuments();
    if (count === 0) {
      await this.taskModel.insertMany(this.withPersonalization(SEED_TASKS));
      console.log('Seeded 30 Pakistan-specific tasks');
    }
    await this.backfillTaskPersonalization();
  }

  async getTodaysTasks(userId: string) {
    const tasks = await this.getPersonalizedTaskPool(userId);
    const today = new Date().toISOString().slice(0, 10);
    const todaySubmissions = await this.submissionModel.find({ userId });
    const completedTodayIds = new Set(
      todaySubmissions
        .filter(s => (s as any).createdAt?.toISOString().slice(0, 10) === today && s.status === SubmissionStatus.APPROVED)
        .map(s => s.taskId.toString()),
    );

    const commitments = await this.commitmentModel.find({ userId, isActive: true });
    const committedIds = new Set(commitments.map(c => c.taskId.toString()));

    const available = tasks.filter(t => !completedTodayIds.has(t._id.toString()));
    const daily = this.pickDailyTasks(available, userId, today);

    return daily.map(t => ({
      ...t.toObject(),
      id: t._id.toString(),
      completedToday: completedTodayIds.has(t._id.toString()),
      committed: committedIds.has(t._id.toString()),
    }));
  }

  private withPersonalization(tasks: any[]) {
    return tasks.map(task => {
      const config = this.getTaskPersonalization(task.title);
      if (!config) return task;
      return {
        ...task,
        lifestyleTypes: JSON.stringify(config.lifestyles || this.parseJsonArray(task.lifestyleTypes, ['all'])),
        taskTags: JSON.stringify(config.tags),
      };
    });
  }

  private async backfillTaskPersonalization() {
    for (const [title, config] of Object.entries(TASK_PERSONALIZATION)) {
      await this.taskModel.updateOne(
        { title: { $regex: this.escapeRegex(title.split('—')[0].trim()), $options: 'i' } },
        {
          $set: {
            taskTags: JSON.stringify(config.tags),
            ...(config.lifestyles ? { lifestyleTypes: JSON.stringify(config.lifestyles) } : {}),
          },
        },
      );
    }
  }

  private async getPersonalizedTaskPool(userId: string) {
    const tasks = await this.taskModel.find({ isActive: true });
    const response = await this.onboardingModel.findOne({ userId });
    if (!response) return tasks.slice(0, 7);

    const answers = this.safeParseObject(response.answers);
    const profile = this.buildTaskProfile(answers, response.lifestyleType);
    const completed = await this.submissionModel.find({ userId, status: SubmissionStatus.APPROVED });
    const completedByCategory = new Map<string, number>();
    for (const sub of completed) {
      const task = tasks.find(t => t._id.toString() === sub.taskId.toString());
      if (task) completedByCategory.set(task.category, (completedByCategory.get(task.category) || 0) + 1);
    }

    const specificMatched = tasks.filter(task => {
      const lifestyles = this.parseJsonArray(task.lifestyleTypes, ['all']);
      const tags = this.parseJsonArray(task.taskTags, ['all']);
      const difficulty = this.getTaskPersonalization(task.title)?.difficulty || 1;
      const unlockedLevel = Math.min(3, 1 + Math.floor((completedByCategory.get(task.category) || 0) / 2));
      const lifestyleMatch = lifestyles.includes('all') || lifestyles.includes(profile.lifestyleType);
      const tagMatch = !tags.includes('all') && tags.some(tag => profile.tags.has(tag));
      return lifestyleMatch && tagMatch && difficulty <= unlockedLevel;
    });

    const genericFallback = tasks.filter(task => {
      const lifestyles = this.parseJsonArray(task.lifestyleTypes, ['all']);
      const tags = this.parseJsonArray(task.taskTags, ['all']);
      return tags.includes('all') && (lifestyles.includes('all') || lifestyles.includes(profile.lifestyleType));
    });
    return specificMatched.length >= 5 ? specificMatched : this.uniqueTasks(specificMatched.concat(genericFallback));
  }

  private buildTaskProfile(answers: Record<string, string>, lifestyleType?: string | null) {
    const tags = new Set<string>(['all']);
    const add = (...items: string[]) => items.forEach(item => tags.add(item));
    const lifestyle = lifestyleType || 'urban_middle';

    if (['urban_affluent', 'urban_middle'].includes(lifestyle)) add('urban');
    if (lifestyle === 'semi_urban') add('semi_urban');
    if (lifestyle === 'rural') add('rural', 'garden');

    const household = answers.household || '';
    if (household.includes('Joint') || household.includes('Nuclear')) add('family_home');
    if (household.includes('Living alone')) add('apartment');
    if (household.includes('Hostel')) add('hostel', 'student');

    const transport = answers.transport_primary || '';
    if (transport.includes('Own car') || transport.includes('Motorcycle') || transport.includes('Rickshaw') || transport.includes('ride-hailing')) add('drives_regularly');
    if (transport.includes('Own car')) add('car_owner');
    if (transport.includes('Public bus') || transport.includes('Metro') || transport.includes('BRT')) add('public_transport_user');
    if (transport.includes('Bicycle') || transport.includes('walking')) add('active_commuter');
    if (transport.includes('work/study from home')) add('office_worker');

    const distance = answers.transport_distance || '';
    if (distance.includes('Less than 3')) add('short_commute');
    if (distance.includes('10') || distance.includes('More than')) add('long_commute');

    const diet = answers.diet_type || '';
    if (!diet.includes('vegetarian') && !diet.includes('Mostly daal')) add('meat_eater');

    const kitchen = answers.kitchen_habits || '';
    if (kitchen.includes('Home-cooked') || kitchen.includes('Mix of home cooking')) add('cooks_at_home');
    if (kitchen.includes('ordering') || kitchen.includes('eat out') || kitchen.includes('dhaba')) add('orders_food');

    const energy = answers.energy_situation || '';
    if (energy.includes('UPS')) add('has_ups');
    const cooling = answers.cooling_method || '';
    if (cooling.includes('AC')) add('uses_ac');
    if (cooling.includes('cooler')) add('uses_cooler', 'uses_water_cooler');

    const water = answers.water_source || '';
    if (water.includes('mineral water')) add('buys_bottled_water');
    if (water.includes('matka')) add('uses_matka');

    const waste = answers.waste_handling || '';
    if (waste.includes('Kabari')) add('already_recycles');
    if (waste.includes('occasionally')) add('some_recycling');
    if (waste.includes('one bin') || waste.includes('Municipal') || waste.includes('burn')) add('no_recycling');

    const shopping = answers.shopping_habits || '';
    if (shopping.includes('Sabzi mandi') || shopping.includes('bazaar')) add('market_shopper');
    if (shopping.includes('supermarket') || shopping.includes('online')) add('supermarket_shopper', 'frequent_shopper');
    if (shopping.includes('Mix of kirana')) add('market_shopper');

    const consumption = answers.consumption_style || '';
    if (consumption.includes('Mall brands') || consumption.includes('online shopping')) add('mall_shopper', 'frequent_shopper');
    if (consumption.includes('keep things for years') || consumption.includes('landa')) add('minimal_shopper');

    if (tags.has('garden') || tags.has('family_home')) add('has_plants');
    return { lifestyleType: lifestyle, tags };
  }

  private pickDailyTasks(tasks: TaskDocument[], userId: string, dateKey: string) {
    const grouped = new Map<string, TaskDocument[]>();
    for (const task of tasks) {
      grouped.set(task.category, [...(grouped.get(task.category) || []), task]);
    }
    const seed = this.hash(`${userId}:${dateKey}`);
    const selected: TaskDocument[] = [];
    for (const [, categoryTasks] of grouped) {
      const sorted = [...categoryTasks].sort((a, b) => this.hash(`${seed}:${a._id}`) - this.hash(`${seed}:${b._id}`));
      if (sorted[0]) selected.push(sorted[0]);
    }
    const remaining = tasks.filter(t => !selected.some(s => s._id.toString() === t._id.toString()))
      .sort((a, b) => this.hash(`${seed}:r:${a._id}`) - this.hash(`${seed}:r:${b._id}`));
    return selected.concat(remaining).slice(0, 7);
  }

  private uniqueTasks(tasks: TaskDocument[]) {
    const seen = new Set<string>();
    return tasks.filter(task => {
      const id = task._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private parseJsonArray(value: string | null | undefined, fallback: string[] = []) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  private safeParseObject(value: string | null | undefined) {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private hash(value: string) {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  private getTaskPersonalization(title: string) {
    const normalizedTitle = this.normalizeTitle(title);
    return Object.entries(TASK_PERSONALIZATION).find(([key]) => this.normalizeTitle(key) === normalizedTitle)?.[1];
  }

  private normalizeTitle(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

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
