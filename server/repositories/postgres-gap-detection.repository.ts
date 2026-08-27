import { eq, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { IGapDetectionRepository } from './gap-detection.repository';
import { UserKnowledgeProfile, KnowledgeGapItem } from '../models/gap-detection.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { logger } from '../utils/logger.util';

export class PostgresGapDetectionRepository implements IGapDetectionRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async saveKnowledgeProfile(profile: UserKnowledgeProfile): Promise<UserKnowledgeProfile> {
    try {
      const evaluatedAt = profile.evaluatedAt ? new Date(profile.evaluatedAt) : new Date();

      // Delete existing gaps for the user to maintain synchronized profile state
      await this.db
        .delete(schema.knowledgeGaps)
        .where(eq(schema.knowledgeGaps.userId, profile.userId));

      for (const gap of profile.identifiedGaps) {
        const gapId = gap.id || randomUUID();
        await this.db.insert(schema.knowledgeGaps).values({
          id: gapId,
          userId: profile.userId,
          category: gap.category,
          topicName: gap.topicName,
          severity: gap.severity,
          scorePercentage: gap.scorePercentage,
          detectedReason: gap.detectedReason,
          recommendedAction: gap.recommendedAction,
          recommendedModuleId: gap.recommendedModuleId,
          evaluatedAt,
          createdAt: evaluatedAt,
        });
      }

      return {
        ...profile,
        evaluatedAt: evaluatedAt.toISOString(),
      };
    } catch (err: any) {
      logger.error('PostgresGapDetectionRepository.saveKnowledgeProfile error:', err.message);
      throw new Error(`Failed to persist knowledge gap profile: ${err.message}`, { cause: err });
    }
  }

  async getKnowledgeProfileByUserId(userId: string): Promise<UserKnowledgeProfile | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.knowledgeGaps)
        .where(eq(schema.knowledgeGaps.userId, userId))
        .orderBy(desc(schema.knowledgeGaps.evaluatedAt));

      if (rows.length === 0) return null;

      const gaps: KnowledgeGapItem[] = rows.map((r) => ({
        id: r.id,
        category: r.category as any,
        topicName: r.topicName,
        severity: r.severity as any,
        scorePercentage: r.scorePercentage,
        detectedReason: r.detectedReason,
        recommendedAction: r.recommendedAction,
        recommendedModuleId: r.recommendedModuleId ?? undefined,
      }));

      const gapSummary = {
        criticalGapsCount: gaps.filter((g) => g.severity === 'critical').length,
        highGapsCount: gaps.filter((g) => g.severity === 'high').length,
        mediumGapsCount: gaps.filter((g) => g.severity === 'medium').length,
        lowGapsCount: gaps.filter((g) => g.severity === 'low').length,
      };

      const firstRow = rows[0];
      const evaluatedAt = firstRow.evaluatedAt instanceof Date
        ? firstRow.evaluatedAt.toISOString()
        : new Date(firstRow.evaluatedAt).toISOString();

      return {
        userId,
        evaluatedAt,
        overallLiteracyLevel: 'beginner',
        gapSummary,
        identifiedGaps: gaps,
        masteredTopics: [],
        aiInsights: 'Knowledge profile generated from persistent diagnostic evaluation records.',
      };
    } catch (err: any) {
      logger.error(`PostgresGapDetectionRepository.getKnowledgeProfileByUserId error for user ${userId}:`, err.message);
      throw new Error(`Failed to get knowledge profile: ${err.message}`, { cause: err });
    }
  }
}
