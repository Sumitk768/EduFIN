import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS } from '../config/constants';

export const RecordLessonCompletionSchema = z.object({
  userId: z.string().uuid(),
  moduleId: z.string(),
  lessonId: z.string(),
  timeSpentSeconds: z.number().int().min(0).default(60),
});

export const RecordQuizScoreSchema = z.object({
  userId: z.string().uuid(),
  category: z.enum(FINANCIAL_CATEGORIES),
  scorePercentage: z.number().min(0).max(100),
  totalQuestions: z.number().int().min(1),
  correctAnswers: z.number().int().min(0),
});

export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.string().datetime().optional(),
});

export const UserProgressSummarySchema = z.object({
  userId: z.string().uuid(),
  currentLevel: z.enum(LITERACY_LEVELS),
  completedLessonsCount: z.number().int(),
  completedQuizzesCount: z.number().int(),
  averageQuizScorePercentage: z.number(),
  currentStreakDays: z.number().int(),
  longestStreakDays: z.number().int(),
  lastActiveDate: z.string(),
  categoryProficiencies: z.record(z.string(), z.number()),
  earnedBadges: z.array(BadgeSchema),
  recentActivities: z.array(
    z.object({
      id: z.string(),
      activityType: z.enum(['lesson_completed', 'quiz_passed', 'streak_extended', 'assessment_finished']),
      title: z.string(),
      timestamp: z.string().datetime(),
    })
  ),
});

export type RecordLessonCompletion = z.infer<typeof RecordLessonCompletionSchema>;
export type RecordQuizScore = z.infer<typeof RecordQuizScoreSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
export type UserProgressSummary = z.infer<typeof UserProgressSummarySchema>;
