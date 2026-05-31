import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserProgressDocument = UserProgress & Document;

/**
 * Ranks earned by completing chapters.
 * Each chapter completion advances the user one rank.
 */
export const RANKS = [
  { rank: 0, title: 'Seedling',        emoji: '🌱', minChapter: 0 },
  { rank: 1, title: 'Sprout',          emoji: '🌿', minChapter: 1 },
  { rank: 2, title: 'Sapling',         emoji: '🌳', minChapter: 2 },
  { rank: 3, title: 'Green Warrior',   emoji: '⚔️', minChapter: 3 },
  { rank: 4, title: 'Eco Guardian',    emoji: '🛡️', minChapter: 4 },
  { rank: 5, title: 'Earth Champion',  emoji: '🏆', minChapter: 5 },
  { rank: 6, title: 'Planet Protector',emoji: '🌍', minChapter: 6 },
  { rank: 7, title: 'Climate Hero',    emoji: '🦸', minChapter: 7 },
  { rank: 8, title: 'Eco Legend',      emoji: '👑', minChapter: 8 },
  { rank: 9, title: 'Sustainability Master', emoji: '✨', minChapter: 9 },
];

@Schema({ timestamps: true })
export class UserProgress {
  @Prop({ required: true, unique: true })
  userId: string;

  /** Current chapter (0-indexed, never ends) */
  @Prop({ default: 0 })
  currentChapter: number;

  /** Current day within the chapter (0-4, each chapter has 5 days) */
  @Prop({ default: 0 })
  currentDay: number;

  /** Task IDs completed in the current day (stored as JSON string array) */
  @Prop({ default: '[]' })
  dayCompletedTaskIds: string;

  /** Days fully completed in current chapter (stored as JSON number array, e.g. [0,1,2]) */
  @Prop({ default: '[]' })
  chapterCompletedDays: string;

  /** Total chapters completed (used for rank) */
  @Prop({ default: 0 })
  chaptersCompleted: number;

  /** The generated chapter plan: JSON array of 5 arrays of task IDs */
  @Prop({ default: null })
  chapterPlan: string;

  /** Signature of the personalized pool used to build the current chapter plan */
  @Prop({ default: null })
  taskPoolSignature: string;

  /** Date when current day was first started (to track day boundaries) */
  @Prop({ default: null })
  dayStartedAt: Date;
}

export const UserProgressSchema = SchemaFactory.createForClass(UserProgress);
