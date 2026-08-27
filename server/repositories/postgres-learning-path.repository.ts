import { eq, asc, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { ILearningPathRepository } from './learning-path.repository';
import { LearningPath, LearningStep } from '../models/learning-path.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { logger } from '../utils/logger.util';

export class PostgresLearningPathRepository implements ILearningPathRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async saveLearningPath(path: LearningPath): Promise<LearningPath> {
    try {
      const pathId = path.id || randomUUID();
      const generatedAt = path.generatedAt ? new Date(path.generatedAt) : new Date();
      const updatedAt = path.updatedAt ? new Date(path.updatedAt) : new Date();

      // Delete existing learning path and steps for this user to ensure clean sync
      const existing = await this.db
        .select()
        .from(schema.learningPaths)
        .where(eq(schema.learningPaths.userId, path.userId));

      if (existing.length > 0) {
        await this.db
          .delete(schema.learningPaths)
          .where(eq(schema.learningPaths.userId, path.userId));
      }

      await this.db.insert(schema.learningPaths).values({
        id: pathId,
        userId: path.userId,
        title: path.title,
        targetLevel: path.targetLevel,
        totalEstimatedMinutes: path.totalEstimatedMinutes,
        completedStepsCount: path.completedStepsCount,
        totalStepsCount: path.totalStepsCount,
        progressPercentage: path.progressPercentage,
        personalizedRationale: path.personalizedRationale,
        generatedAt,
        updatedAt,
        createdAt: generatedAt,
      });

      for (const step of path.steps) {
        const stepId = step.id || `step-${randomUUID().substring(0, 8)}`;
        await this.db.insert(schema.learningPathSteps).values({
          id: stepId,
          learningPathId: pathId,
          userId: path.userId,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          category: step.category,
          targetModuleId: step.targetModuleId,
          estimatedMinutes: step.estimatedMinutes,
          status: step.status || 'not_started',
          skillsTaught: step.skillsTaught,
          createdAt: generatedAt,
          updatedAt,
        });
      }

      return {
        ...path,
        id: pathId,
        generatedAt: generatedAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      };
    } catch (err: any) {
      logger.error('PostgresLearningPathRepository.saveLearningPath error:', err.message);
      throw new Error(`Failed to save learning path: ${err.message}`, { cause: err });
    }
  }

  async getLearningPathByUserId(userId: string): Promise<LearningPath | null> {
    try {
      const paths = await this.db
        .select()
        .from(schema.learningPaths)
        .where(eq(schema.learningPaths.userId, userId))
        .orderBy(desc(schema.learningPaths.generatedAt))
        .limit(1);

      if (paths.length === 0) return null;
      const pathRow = paths[0];

      const stepRows = await this.db
        .select()
        .from(schema.learningPathSteps)
        .where(eq(schema.learningPathSteps.learningPathId, pathRow.id))
        .orderBy(asc(schema.learningPathSteps.stepNumber));

      const steps: LearningStep[] = stepRows.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        title: s.title,
        description: s.description,
        category: s.category as any,
        targetModuleId: s.targetModuleId,
        estimatedMinutes: s.estimatedMinutes,
        status: s.status as any,
        skillsTaught: Array.isArray(s.skillsTaught) ? s.skillsTaught : [],
      }));

      const completedCount = steps.filter((s) => s.status === 'completed').length;
      const totalCount = steps.length || pathRow.totalStepsCount || 1;
      const progressPercent = Math.round((completedCount / totalCount) * 100);

      return {
        id: pathRow.id,
        userId: pathRow.userId,
        title: pathRow.title,
        targetLevel: pathRow.targetLevel as any,
        generatedAt: pathRow.generatedAt instanceof Date ? pathRow.generatedAt.toISOString() : new Date(pathRow.generatedAt).toISOString(),
        updatedAt: pathRow.updatedAt instanceof Date ? pathRow.updatedAt.toISOString() : new Date(pathRow.updatedAt).toISOString(),
        totalEstimatedMinutes: pathRow.totalEstimatedMinutes,
        completedStepsCount: completedCount,
        totalStepsCount: steps.length,
        progressPercentage: progressPercent,
        steps,
        personalizedRationale: pathRow.personalizedRationale,
      };
    } catch (err: any) {
      logger.error(`PostgresLearningPathRepository.getLearningPathByUserId error for user ${userId}:`, err.message);
      throw new Error(`Failed to get learning path: ${err.message}`, { cause: err });
    }
  }

  async updateStepStatus(
    userId: string,
    stepId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<LearningPath | null> {
    try {
      const currentPath = await this.getLearningPathByUserId(userId);
      if (!currentPath) return null;

      const stepExists = currentPath.steps.some((s) => s.id === stepId);
      if (!stepExists) return null;

      const now = new Date();

      await this.db
        .update(schema.learningPathSteps)
        .set({
          status,
          updatedAt: now,
        })
        .where(eq(schema.learningPathSteps.id, stepId));

      const updatedSteps = currentPath.steps.map((s) =>
        s.id === stepId ? { ...s, status } : s
      );

      const completedStepsCount = updatedSteps.filter((s) => s.status === 'completed').length;
      const progressPercentage = Math.round((completedStepsCount / updatedSteps.length) * 100);

      await this.db
        .update(schema.learningPaths)
        .set({
          completedStepsCount,
          progressPercentage,
          updatedAt: now,
        })
        .where(eq(schema.learningPaths.id, currentPath.id));

      return {
        ...currentPath,
        completedStepsCount,
        progressPercentage,
        updatedAt: now.toISOString(),
        steps: updatedSteps,
      };
    } catch (err: any) {
      logger.error(`PostgresLearningPathRepository.updateStepStatus error for step ${stepId}:`, err.message);
      throw new Error(`Failed to update step status: ${err.message}`, { cause: err });
    }
  }
}
