import { eq, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { IAssessmentRepository } from './assessment.repository';
import { AssessmentQuestion, AssessmentResult, CategoryScore } from '../models/assessment.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { INITIAL_ASSESSMENT_QUESTIONS } from '../data/initial-assessments';
import { logger } from '../utils/logger.util';

export class PostgresAssessmentRepository implements IAssessmentRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async getAssessmentQuestions(): Promise<AssessmentQuestion[]> {
    try {
      const rows = await this.db.select().from(schema.assessmentQuestions);
      if (rows.length === 0) {
        // Fallback to static assessment questions if DB hasn't been seeded yet
        return INITIAL_ASSESSMENT_QUESTIONS;
      }
      return rows.map((r) => ({
        id: r.id,
        category: r.category as any,
        difficulty: r.difficulty as any,
        question: r.question,
        options: Array.isArray(r.options) ? r.options : [],
        explanation: r.explanation,
        correctOptionId: r.correctOptionId,
      }));
    } catch (err: any) {
      logger.warn('PostgresAssessmentRepository.getAssessmentQuestions query failed, using static fallback:', err.message);
      return INITIAL_ASSESSMENT_QUESTIONS;
    }
  }

  async getQuestionById(id: string): Promise<AssessmentQuestion | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.assessmentQuestions)
        .where(eq(schema.assessmentQuestions.id, id))
        .limit(1);

      if (rows.length === 0) {
        return INITIAL_ASSESSMENT_QUESTIONS.find((q) => q.id === id) || null;
      }

      const r = rows[0];
      return {
        id: r.id,
        category: r.category as any,
        difficulty: r.difficulty as any,
        question: r.question,
        options: Array.isArray(r.options) ? r.options : [],
        explanation: r.explanation,
        correctOptionId: r.correctOptionId,
      };
    } catch (err: any) {
      logger.error(`PostgresAssessmentRepository.getQuestionById error for id ${id}:`, err.message);
      return INITIAL_ASSESSMENT_QUESTIONS.find((q) => q.id === id) || null;
    }
  }

  async saveResult(result: AssessmentResult): Promise<AssessmentResult> {
    try {
      const assessmentId = result.assessmentId || randomUUID();
      const completedAt = result.completedAt ? new Date(result.completedAt) : new Date();

      await this.db.insert(schema.assessments).values({
        id: assessmentId,
        userId: result.userId,
        totalQuestions: result.totalQuestions,
        totalCorrect: result.totalCorrect,
        overallScorePercentage: result.overallScorePercentage,
        recommendedLevel: result.recommendedLevel,
        categoryBreakdown: result.categoryBreakdown,
        identifiedGaps: result.identifiedGaps,
        strengths: result.strengths,
        completedAt,
        createdAt: completedAt,
      });

      return {
        ...result,
        assessmentId,
        completedAt: completedAt.toISOString(),
      };
    } catch (err: any) {
      logger.error('PostgresAssessmentRepository.saveResult error:', err.message);
      throw new Error(`Failed to persist assessment result: ${err.message}`, { cause: err });
    }
  }

  async getLatestResultByUserId(userId: string): Promise<AssessmentResult | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.assessments)
        .where(eq(schema.assessments.userId, userId))
        .orderBy(desc(schema.assessments.completedAt))
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapAssessmentToDomain(rows[0]);
    } catch (err: any) {
      logger.error(`PostgresAssessmentRepository.getLatestResultByUserId error for user ${userId}:`, err.message);
      throw new Error(`Failed to get latest assessment result: ${err.message}`, { cause: err });
    }
  }

  async getAllResultsByUserId(userId: string): Promise<AssessmentResult[]> {
    try {
      const rows = await this.db
        .select()
        .from(schema.assessments)
        .where(eq(schema.assessments.userId, userId))
        .orderBy(desc(schema.assessments.completedAt));

      return rows.map((r) => this.mapAssessmentToDomain(r));
    } catch (err: any) {
      logger.error(`PostgresAssessmentRepository.getAllResultsByUserId error for user ${userId}:`, err.message);
      throw new Error(`Failed to get assessment results: ${err.message}`, { cause: err });
    }
  }

  private mapAssessmentToDomain(row: typeof schema.assessments.$inferSelect): AssessmentResult {
    return {
      assessmentId: row.id,
      userId: row.userId,
      completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : new Date(row.completedAt).toISOString(),
      totalQuestions: row.totalQuestions,
      totalCorrect: row.totalCorrect,
      overallScorePercentage: row.overallScorePercentage,
      recommendedLevel: row.recommendedLevel as any,
      categoryBreakdown: (Array.isArray(row.categoryBreakdown) ? row.categoryBreakdown : []) as CategoryScore[],
      identifiedGaps: Array.isArray(row.identifiedGaps) ? row.identifiedGaps : [],
      strengths: Array.isArray(row.strengths) ? row.strengths : [],
    };
  }
}
