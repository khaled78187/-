/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestionType = 'multiple_choice' | 'image_match' | 'scramble_order' | 'true_false';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation?: string; // Socrates' wisdom text if the user makes a mistake
  hint?: string; // High-quality educational hints if the user gets stuck
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correctAnswer: string;
}

export interface ImageMatchQuestion extends BaseQuestion {
  type: 'image_match';
  pairs: {
    word: string;
    image: string; // Icon identifier or standard accessible CDN/Emoji
  }[];
}

export interface ScrambleOrderQuestion extends BaseQuestion {
  type: 'scramble_order';
  items: string[]; // Scrambled items
  correctOrder: string[]; // Correct ordered items
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctAnswer: boolean;
}

export type Question = MultipleChoiceQuestion | ImageMatchQuestion | ScrambleOrderQuestion | TrueFalseQuestion;

export interface Lesson {
  id: string;
  title: string;
  questions: Question[];
  xpReward: number;
}

export interface SkillNode {
  id: string;
  title: string;
  icon: string; // Lucide icon string
  description: string;
  lessons: Lesson[];
  levelCount: number; // Duolingo levels inside a single node, e.g., 5 levels
  requiredNodes: string[]; // Unlocks after these are done
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface DailyActivity {
  day: string; // e.g. "الأحد", "الاثنين"
  xp: number;
  dateStr: string;
}

export interface UserProgress {
  hearts: number;
  streak: number;
  xp: number;
  currentNodeId: string;
  currentLessonId: string;
  completedLessons: string[]; // List of lesson IDs completed
  completedNodes: string[]; // List of node IDs completed
  weeklyActivity: DailyActivity[];
  league: string; // Bronze, Silver, Gold, Platinum, Diamond
  lastActiveDate: string; // For streak calculation
  isPremium?: boolean;
  subscriptionType?: 'monthly' | 'yearly';
  subscriptionExpiry?: string;
  dailyXpGoal?: number;
  displayName?: string;
  avatar?: string;
}

export type SocratesMood = 'happy' | 'sad' | 'thinking' | 'neutral' | 'wise';
