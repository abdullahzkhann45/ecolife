/**
 * Pakistan-specific onboarding questionnaire
 * 12 questions across 6 sections to classify lifestyle and calculate baseline eco-score
 */

export interface QuestionDef {
  id: string;
  section: string;
  sectionIcon: string;
  question: string;
  options: string[];
}

export const PAKISTAN_QUESTIONS: QuestionDef[] = [
  // ── Section 1: Location & Household ──
  {
    id: 'area_type',
    section: 'Location & Household',
    sectionIcon: '§',
    question: 'Where do you live?',
    options: [
      'Major city (Karachi, Lahore, Islamabad, Rawalpindi, etc.)',
      'Smaller city (Faisalabad, Multan, Peshawar, Hyderabad, etc.)',
      'Town or semi-urban area',
      'Village or rural area',
    ],
  },
  {
    id: 'household',
    section: 'Location & Household',
    sectionIcon: '§',
    question: "What's your household setup?",
    options: [
      'Joint family (5+ people, shared kitchen)',
      'Nuclear family (2–4 people)',
      'Living alone or with roommates',
      'Hostel or shared accommodation',
    ],
  },

  // ── Section 2: Transport ──
  {
    id: 'transport_primary',
    section: 'Transport',
    sectionIcon: '↗',
    question: 'How do you get around most days?',
    options: [
      'Own car (petrol/diesel)',
      'Own car (CNG/hybrid)',
      'Motorcycle or scooty',
      'Rickshaw, Qingqi, or ride-hailing (Careem/InDrive)',
      'Public bus, Suzuki van, Metro, or BRT',
      'Bicycle or walking',
      'Mostly work/study from home',
    ],
  },
  {
    id: 'transport_distance',
    section: 'Transport',
    sectionIcon: '↗',
    question: 'How far is your daily commute?',
    options: [
      'Less than 3 km',
      '3–10 km',
      '10–25 km',
      'More than 25 km',
    ],
  },

  // ── Section 3: Diet & Kitchen ──
  {
    id: 'diet_type',
    section: 'Diet & Kitchen',
    sectionIcon: '◍',
    question: 'How would you describe your daily meals?',
    options: [
      'Heavy meat/gosht every day (beef, mutton, chicken)',
      'Meat 3–4 times a week, daal/sabzi on other days',
      'Mostly daal, sabzi, roti — meat only on weekends or occasions',
      'Fully vegetarian',
      'Trying to reduce meat, eat more plant-based',
    ],
  },
  {
    id: 'kitchen_habits',
    section: 'Diet & Kitchen',
    sectionIcon: '◍',
    question: 'How is food prepared in your home?',
    options: [
      'Home-cooked on gas stove (roti, sabzi, daal daily)',
      'Mix of home cooking and ordering from restaurants/apps',
      'Mostly eat out, order in, or eat at dhaba/hotel',
      'Hostel mess or canteen',
    ],
  },

  // ── Section 4: Energy & Water ──
  {
    id: 'energy_situation',
    section: 'Energy & Water',
    sectionIcon: '⚡',
    question: "What's your electricity situation?",
    options: [
      'Regular load-shedding, using UPS/generator',
      'Load-shedding, recently added solar panels',
      'Mostly stable electricity, minimal outages',
      'Running on solar/hybrid system',
      'Running a generator most of the time',
    ],
  },
  {
    id: 'cooling_method',
    section: 'Energy & Water',
    sectionIcon: '⚡',
    question: 'How do you cool your home in summer?',
    options: [
      'AC in most rooms',
      'AC in one room, fans in others',
      'Desert/room cooler (evaporative)',
      'Ceiling fans only',
      'Mix of AC and coolers',
    ],
  },
  {
    id: 'water_source',
    section: 'Energy & Water',
    sectionIcon: '⚡',
    question: "What's your main drinking water source?",
    options: [
      'Municipal supply (nalkaa) with home filter/RO',
      'Boring/tube well water',
      'Water tanker delivery',
      'Buy mineral water bottles regularly',
      'Clay matka or earthen pot with tap water',
    ],
  },

  // ── Section 5: Waste ──
  {
    id: 'waste_handling',
    section: 'Waste',
    sectionIcon: '↻',
    question: 'What happens to your household waste?',
    options: [
      'Kabari wala comes regularly, we separate recyclables for him',
      'We occasionally separate plastic/paper but mostly one bin',
      'Everything goes in one bin for the garbage collector',
      'We burn our trash',
      'Municipal collection, no separation',
    ],
  },

  // ── Section 6: Shopping & Consumption ──
  {
    id: 'shopping_habits',
    section: 'Shopping & Consumption',
    sectionIcon: '◊',
    question: 'Where do you usually buy groceries?',
    options: [
      'Sabzi mandi or local bazaar with a cloth thaila/jhola',
      'Mix of kirana store and supermarket',
      'Mostly supermarket/hypermarket (Metro, Imtiaz, etc.)',
      'Mostly online grocery delivery',
    ],
  },
  {
    id: 'consumption_style',
    section: 'Shopping & Consumption',
    sectionIcon: '◊',
    question: 'When it comes to clothes and household items?',
    options: [
      'Buy from landa bazaar (thrift/second-hand)',
      'Local tailor or market — keep things for years',
      'Mall brands and online shopping regularly',
      'Mix of local and branded',
    ],
  },
];

// ── Sustainability scores per answer (0-100, higher = more sustainable) ──

export const ANSWER_SCORES: Record<string, Record<string, number>> = {
  area_type: {
    'Major city (Karachi, Lahore, Islamabad, Rawalpindi, etc.)': 50,
    'Smaller city (Faisalabad, Multan, Peshawar, Hyderabad, etc.)': 55,
    'Town or semi-urban area': 60,
    'Village or rural area': 65,
  },
  household: {
    'Joint family (5+ people, shared kitchen)': 80,   // shared resources = efficient
    'Nuclear family (2–4 people)': 60,
    'Living alone or with roommates': 45,
    'Hostel or shared accommodation': 70,
  },
  transport_primary: {
    'Own car (petrol/diesel)': 15,
    'Own car (CNG/hybrid)': 35,
    'Motorcycle or scooty': 40,
    'Rickshaw, Qingqi, or ride-hailing (Careem/InDrive)': 50,
    'Public bus, Suzuki van, Metro, or BRT': 75,
    'Bicycle or walking': 95,
    'Mostly work/study from home': 85,
  },
  transport_distance: {
    'Less than 3 km': 90,
    '3–10 km': 65,
    '10–25 km': 35,
    'More than 25 km': 15,
  },
  diet_type: {
    'Heavy meat/gosht every day (beef, mutton, chicken)': 15,
    'Meat 3–4 times a week, daal/sabzi on other days': 40,
    'Mostly daal, sabzi, roti — meat only on weekends or occasions': 70,
    'Fully vegetarian': 90,
    'Trying to reduce meat, eat more plant-based': 60,
  },
  kitchen_habits: {
    'Home-cooked on gas stove (roti, sabzi, daal daily)': 75,
    'Mix of home cooking and ordering from restaurants/apps': 50,
    'Mostly eat out, order in, or eat at dhaba/hotel': 25,
    'Hostel mess or canteen': 55,
  },
  energy_situation: {
    'Regular load-shedding, using UPS/generator': 30,
    'Load-shedding, recently added solar panels': 75,
    'Mostly stable electricity, minimal outages': 50,
    'Running on solar/hybrid system': 90,
    'Running a generator most of the time': 10,
  },
  cooling_method: {
    'AC in most rooms': 10,
    'AC in one room, fans in others': 35,
    'Desert/room cooler (evaporative)': 65,
    'Ceiling fans only': 90,
    'Mix of AC and coolers': 45,
  },
  water_source: {
    'Municipal supply (nalkaa) with home filter/RO': 70,
    'Boring/tube well water': 55,
    'Water tanker delivery': 35,
    'Buy mineral water bottles regularly': 10,
    'Clay matka or earthen pot with tap water': 85,
  },
  waste_handling: {
    'Kabari wala comes regularly, we separate recyclables for him': 90,
    'We occasionally separate plastic/paper but mostly one bin': 55,
    'Everything goes in one bin for the garbage collector': 30,
    'We burn our trash': 5,
    'Municipal collection, no separation': 25,
  },
  shopping_habits: {
    'Sabzi mandi or local bazaar with a cloth thaila/jhola': 90,
    'Mix of kirana store and supermarket': 60,
    'Mostly supermarket/hypermarket (Metro, Imtiaz, etc.)': 35,
    'Mostly online grocery delivery': 25,
  },
  consumption_style: {
    'Buy from landa bazaar (thrift/second-hand)': 95,
    'Local tailor or market — keep things for years': 80,
    'Mall brands and online shopping regularly': 20,
    'Mix of local and branded': 50,
  },
};

// ── Category weights for baseline score ──

export const CATEGORY_WEIGHTS: Record<string, { questions: string[]; weight: number }> = {
  transport: { questions: ['transport_primary', 'transport_distance'], weight: 0.20 },
  diet:     { questions: ['diet_type', 'kitchen_habits'], weight: 0.15 },
  energy:   { questions: ['energy_situation', 'cooling_method'], weight: 0.20 },
  water:    { questions: ['water_source'], weight: 0.15 },
  waste:    { questions: ['waste_handling'], weight: 0.15 },
  consumption: { questions: ['shopping_habits', 'consumption_style'], weight: 0.15 },
};

// ── Lifestyle classification ──

export enum LifestyleType {
  URBAN_AFFLUENT = 'urban_affluent',
  URBAN_MIDDLE = 'urban_middle',
  SEMI_URBAN = 'semi_urban',
  RURAL = 'rural',
}

export function classifyLifestyle(answers: Record<string, string>): LifestyleType {
  const area = answers.area_type || '';
  const transport = answers.transport_primary || '';
  const cooling = answers.cooling_method || '';
  const shopping = answers.shopping_habits || '';
  const waste = answers.waste_handling || '';
  const water = answers.water_source || '';

  const isMajorCity = area.startsWith('Major city');
  const isSmallerCity = area.startsWith('Smaller city');
  const isTown = area.startsWith('Town');
  const isVillage = area.startsWith('Village');

  const hasCar = transport.startsWith('Own car (petrol') || transport.startsWith('Own car (CNG');
  const hasACMostRooms = cooling === 'AC in most rooms';
  const shopsSupermarket = shopping.startsWith('Mostly supermarket') || shopping.startsWith('Mostly online');

  // Rural
  if (isVillage) return LifestyleType.RURAL;
  if (waste === 'We burn our trash' && water.startsWith('Boring') && cooling === 'Ceiling fans only') {
    return LifestyleType.RURAL;
  }

  // Urban Affluent
  if (isMajorCity && (hasCar || hasACMostRooms) && shopsSupermarket) {
    return LifestyleType.URBAN_AFFLUENT;
  }
  if (isMajorCity && hasCar && hasACMostRooms) {
    return LifestyleType.URBAN_AFFLUENT;
  }

  // Semi-Urban
  if (isTown) return LifestyleType.SEMI_URBAN;
  if (isSmallerCity && (cooling === 'Ceiling fans only' || cooling.startsWith('Desert'))) {
    return LifestyleType.SEMI_URBAN;
  }

  // Default: Urban Middle
  return LifestyleType.URBAN_MIDDLE;
}

/**
 * Calculate per-category scores (0-100) and overall baseline (0-1000)
 */
export function calculatePakistanBaseline(answers: Record<string, string>): {
  baselineScore: number;
  categoryScores: Record<string, number>;
} {
  const categoryScores: Record<string, number> = {};

  for (const [category, config] of Object.entries(CATEGORY_WEIGHTS)) {
    const scores = config.questions
      .map(qId => ANSWER_SCORES[qId]?.[answers[qId]] ?? 50)
      .filter(s => s !== undefined);

    categoryScores[category] = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 50;
  }

  // Also include area_type and household as modifiers
  const areaScore = ANSWER_SCORES.area_type?.[answers.area_type] ?? 50;
  const householdScore = ANSWER_SCORES.household?.[answers.household] ?? 50;
  const contextModifier = (areaScore + householdScore) / 2;

  // Weighted average of category scores
  let weightedSum = 0;
  for (const [category, config] of Object.entries(CATEGORY_WEIGHTS)) {
    weightedSum += categoryScores[category] * config.weight;
  }

  // Blend in context modifier (10% weight)
  const rawScore = weightedSum * 0.9 + contextModifier * 0.1;

  // Scale to 0-1000
  const baselineScore = Math.max(0, Math.min(1000, Math.round(rawScore * 10)));

  return { baselineScore, categoryScores };
}
