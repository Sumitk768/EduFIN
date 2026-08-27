import { eq, desc, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import {
  IScamAnalysisRepository,
  StoredScamAnalysis,
} from './scam-analysis.repository';
import { ScamAnalysisResult } from '../models/scam-checker.model';
import { logger } from '../utils/logger.util';

export class PostgresScamAnalysisRepository implements IScamAnalysisRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async create(data: {
    userId?: string | null;
    messageText: string;
    senderInfo?: string | null;
    channel: string;
    language: string;
    result: ScamAnalysisResult;
  }): Promise<StoredScamAnalysis> {
    try {
      const id = `scam-analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const [row] = await this.db
        .insert(schema.scamAnalyses)
        .values({
          id,
          userId: data.userId || null,
          messageText: data.messageText,
          senderInfo: data.senderInfo || null,
          channel: data.channel,
          language: data.language,
          scamRiskScore: data.result.riskScore,
          riskLevel: data.result.riskLevel,
          detectedScamType: data.result.scamType,
          redFlags: data.result.redFlags,
          explanation: data.result.explanation,
          urgencyTacticDetected: data.result.urgencyTacticDetected,
          suspiciousElementsFound: data.result.suspiciousElementsFound,
          safeActionRecommendations: data.result.recommendedActions,
          helplineOrReportingAdvice: data.result.helplineOrReportingAdvice,
        })
        .returning();

      return this.mapToStored(row);
    } catch (err: any) {
      logger.error(`PostgresScamAnalysisRepository.create error: ${err.message}`);
      throw new Error(`Failed to persist scam analysis: ${err.message}`, { cause: err });
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<StoredScamAnalysis[]> {
    try {
      const rows = await this.db
        .select()
        .from(schema.scamAnalyses)
        .where(eq(schema.scamAnalyses.userId, userId))
        .orderBy(desc(schema.scamAnalyses.createdAt))
        .limit(limit);

      return rows.map((r) => this.mapToStored(r));
    } catch (err: any) {
      logger.error(`PostgresScamAnalysisRepository.findByUserId error: ${err.message}`);
      throw new Error(`Failed to retrieve scam analyses for user ${userId}: ${err.message}`, { cause: err });
    }
  }

  async findById(id: string): Promise<StoredScamAnalysis | null> {
    try {
      const [row] = await this.db
        .select()
        .from(schema.scamAnalyses)
        .where(eq(schema.scamAnalyses.id, id))
        .limit(1);

      if (!row) return null;
      return this.mapToStored(row);
    } catch (err: any) {
      logger.error(`PostgresScamAnalysisRepository.findById error for id ${id}: ${err.message}`);
      throw new Error(`Failed to retrieve scam analysis by ID: ${err.message}`, { cause: err });
    }
  }

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(schema.scamAnalyses)
        .where(and(eq(schema.scamAnalyses.id, id), eq(schema.scamAnalyses.userId, userId)))
        .returning({ id: schema.scamAnalyses.id });

      return result.length > 0;
    } catch (err: any) {
      logger.error(`PostgresScamAnalysisRepository.delete error for id ${id}: ${err.message}`);
      throw new Error(`Failed to delete scam analysis: ${err.message}`, { cause: err });
    }
  }

  private mapToStored(row: any): StoredScamAnalysis {
    return {
      id: row.id,
      userId: row.userId,
      messageText: row.messageText,
      senderInfo: row.senderInfo,
      channel: row.channel,
      language: row.language,
      scamRiskScore: row.scamRiskScore,
      riskLevel: row.riskLevel,
      detectedScamType: row.detectedScamType,
      redFlags: row.redFlags || [],
      explanation: row.explanation,
      urgencyTacticDetected: row.urgencyTacticDetected || false,
      suspiciousElementsFound: row.suspiciousElementsFound || [],
      safeActionRecommendations: row.safeActionRecommendations || [],
      helplineOrReportingAdvice: row.helplineOrReportingAdvice,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    };
  }
}
