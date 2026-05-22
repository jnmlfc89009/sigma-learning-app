/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProgress {
  personalFinance: {
    level: number; // 1-12
    progressPercent: number; // e.g. 18
    completedLevels: Record<number, { stars: number; completedAt: string }>;
  };
  accounting: {
    level: number; // 1-12
    progressPercent: number; // e.g. 35
    completedLevels: Record<number, { stars: number; completedAt: string }>;
  };
  statistics: {
    level: number; // 1-12
    progressPercent: number; // e.g. 0
    completedLevels: Record<number, { stars: number; completedAt: string }>;
  };
  appliedMath: {
    level: number; // 1-12
    progressPercent: number; // e.g. 0
    completedLevels: Record<number, { stars: number; completedAt: string }>;
  };
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  streak: number;
  gems: number;
  tier: 'scholar' | 'analyst' | 'magnate';
  billingCycle: 'monthly' | 'annual';
  createdAt: string;
  avatarSeed: string; // Used to generate nice avatars
  progress: UserProgress;
  unlockedTrack?: 'personalFinance' | 'accounting' | 'statistics';
  unlockedLevels?: Record<string, number[]>; // Maps track name -> array of unlocked level numbers (e.g. [4, 5])
  unlockedItems?: string[];
  activeTitle?: string;
  sponsoredCount?: number;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'calculation' | 't-account' | 'boolean';
  questionText: string;
  options?: string[];
  correctAnswer: string; // For MCQ: option string. For calculation: value.
  explanation: string;
  mitOcwReference: string; // Reference to specific MIT OCW course
  tAccountDetails?: {
    accountName: string;
    increaseType: 'debit' | 'credit';
    decreaseType: 'debit' | 'credit';
  };
}

export interface LearningLevel {
  levelNumber: number;
  title: string;
  description: string;
  track: 'personalFinance' | 'accounting' | 'statistics' | 'appliedMath';
  chapters: {
    id: string;
    title: string;
    description: string;
    questionsCount: number;
    quizQuestions: Question[];
    readingContent: string[]; // Bites of knowledge
  }[];
}

export interface SecurityAuditLog {
  timestamp: string;
  action: string;
  details: string;
  encryptedPayloadPreview?: string;
  decryptedVerification: boolean;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}
