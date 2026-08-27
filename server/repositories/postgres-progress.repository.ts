import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { IProgressRepository } from './progress.repository';
import { UserProgressSummary, Badge } from '../models/progress.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { logger } from '../utils/logger.util';

const DEFAULT_BADGES: Badge[] = [
  { id: 'b-first-step', name: 'First Financial Step', description: 'Completed your very first financial literacy lesson', icon: 'award' },
  { id: 'b-budget-master', name: 'Budget Architect', description: 'Mastered the 50/30/20 allocation principles', icon: 'wallet' },
  { id: 'b-scam-shield', name: 'Fraud Shield', description: 'Successfully detected 3 fraudulent scam messages', icon: 'shield-check' },
  { id: 'b-compound-wizard', name: 'Compounding Wizard', description: 'Simulated and understood long-term wealth growth', icon: 'trending-up' },
  { id: 'b-streak-7', name: '7-Day Financial Streak', description: 'Maintained continuous daily learning for 7 days', icon: 'zap' },
];

export class PostgresProgressRepository implements IProgressRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  private async getOrCreateProgress(userId: string): Promise<typeof schema.progress.$inferSelect> {
    const existing = await this.db
      .select()
      .from(schema.progress)
      .where(eq(schema.progress.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const id = randomUUID();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const defaultProficiencies: Record<string, number> = {
      budgeting_basics: 10,
      emergency_savings: 5,
      banking_services: 0,
      debt_and_credit: 0,
      investing_fundamentals: 0,
      retirement_planning: 0,
      taxation_and_deductions: 0,
      fraud_and_scam_protection: 15,
      insurance_basics: 0,
    };

    const initialBadges = [DEFAULT_BADGES[0]];
    const initialActivities = [
      {
        id: randomUUID(),
        activityType: 'assessment_finished',
        title: 'Diagnostic Financial Literacy Evaluation',
        timestamp: now.toISOString(),
      },
    ];

    const inserted = await this.db
      .insert(schema.progress)
      .values({
        id,
        userId,
        currentLevel: 'beginner',
        completedLessonsCount: 0,
        completedQuizzesCount: 0,
        averageQuizScorePercentage: 0,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: today,
        categoryProficiencies: defaultProficiencies,
        earnedBadges: initialBadges,
        recentActivities: initialActivities,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted[0];
  }

  async getUserProgress(userId: string): Promise<UserProgressSummary> {
    try {
      const row = await this.getOrCreateProgress(userId);
      return this.mapToDomain(row);
    } catch (err: any) {
      logger.error(`PostgresProgressRepository.getUserProgress error for user ${userId}:`, err.message);
      throw new Error(`Failed to get user progress: ${err.message}`, { cause: err });
    }
  }

  async recordActivity(
    userId: string,
    activityType: 'lesson_completed' | 'quiz_passed' | 'streak_extended' | 'assessment_finished',
    title: string
  ): Promise<void> {
    try {
      const current = await this.getOrCreateProgress(userId);
      const existingActivities = Array.isArray(current.recentActivities) ? current.recentActivities : [];

      const newActivity = {
        id: randomUUID(),
        activityType,
        title,
        timestamp: new Date().toISOString(),
      };

      const updatedActivities = [newActivity, ...existingActivities].slice(0, 20);

      await this.db
        .update(schema.progress)
        .set({
          recentActivities: updatedActivities,
          updatedAt: new Date(),
        })
        .where(eq(schema.progress.userId, userId));
    } catch (err: any) {
      logger.error(`PostgresProgressRepository.recordActivity error for user ${userId}:`, err.message);
      throw new Error(`Failed to record activity: ${err.message}`, { cause: err });
    }
  }

  async incrementLessonCompletion(userId: string, category: string): Promise<UserProgressSummary> {
    try {
      const current = await this.getOrCreateProgress(userId);
      const proficiencies = (current.categoryProficiencies || {}) as Record<string, number>;
      const currentScore = proficiencies[category] || 0;
      proficiencies[category] = Math.min(100, currentScore + 15);

      const badges = (Array.isArray(current.earnedBadges) ? [...current.earnedBadges] : []) as Badge[];
      const completedCount = current.completedLessonsCount + 1;

      if (completedCount >= 5 && !badges.some((b) => b.id === 'b-budget-master')) {
        badges.push({ ...DEFAULT_BADGES[1], unlockedAt: new Date().toISOString() });
      }

      const updated = await this.db
        .update(schema.progress)
        .set({
          completedLessonsCount: completedCount,
          categoryProficiencies: proficiencies,
          earnedBadges: badges,
          updatedAt: new Date(),
        })
        .where(eq(schema.progress.userId, userId))
        .returning();

      return this.mapToDomain(updated[0]);
    } catch (err: any) {
      logger.error(`PostgresProgressRepository.incrementLessonCompletion error for user ${userId}:`, err.message);
      throw new Error(`Failed to increment lesson completion: ${err.message}`, { cause: err });
    }
  }

  async recordQuizScore(userId: string, category: string, score: number): Promise<UserProgressSummary> {
    try {
      const current = await this.getOrCreateProgress(userId);
      const totalPrior = current.completedQuizzesCount;
      const currentAvg = current.averageQuizScorePercentage;
      const newTotal = totalPrior + 1;
      const newAvg = Math.round(((currentAvg * totalPrior + score) / newTotal) * 10) / 10;

      const proficiencies = (current.categoryProficiencies || {}) as Record<string, number>;
      const currentScore = proficiencies[category] || 0;
      const weight = score >= 70 ? 20 : 5;
      proficiencies[category] = Math.min(100, currentScore + weight);

      // Record in quiz attempts table
      await this.db.insert(schema.quizAttempts).values({
        id: randomUUID(),
        userId,
        category,
        scorePercentage: score,
        totalQuestions: 5,
        correctAnswers: Math.round((score / 100) * 5),
        createdAt: new Date(),
      });

      const updated = await this.db
        .update(schema.progress)
        .set({
          completedQuizzesCount: newTotal,
          averageQuizScorePercentage: newAvg,
          categoryProficiencies: proficiencies,
          updatedAt: new Date(),
        })
        .where(eq(schema.progress.userId, userId))
        .returning();

      return this.mapToDomain(updated[0]);
    } catch (err: any) {
      logger.error(`PostgresProgressRepository.recordQuizScore error for user ${userId}:`, err.message);
      throw new Error(`Failed to record quiz score: ${err.message}`, { cause: err });
    }
  }

  private mapToDomain(row: typeof schema.progress.$inferSelect): UserProgressSummary {
    return {
      userId: row.userId,
      currentLevel: row.currentLevel as any,
      completedLessonsCount: row.completedLessonsCount,
      completedQuizzesCount: row.completedQuizzesCount,
      averageQuizScorePercentage: row.averageQuizScorePercentage,
      currentStreakDays: row.currentStreakDays,
      longestStreakDays: row.longestStreakDays,
      lastActiveDate: row.lastActiveDate,
      categoryProficiencies: (row.categoryProficiencies || {}) as Record<string, number>,
      earnedBadges: Array.isArray(row.earnedBadges) ? row.earnedBadges : [],
      recentActivities: Array.isArray(row.recentActivities) ? row.recentActivities : [],
    };
  }
}
