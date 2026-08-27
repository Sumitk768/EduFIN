import {
  IAssessmentRepository,
  IGapDetectionRepository,
  IKnowledgeRepository,
  repositoryFactory,
} from '../repositories';
import {
  UserKnowledgeProfile,
  KnowledgeGapItem,
  GapSeverity,
} from '../models/gap-detection.model';
import { getGeminiClient } from '../ai/gemini.client';
import { AI_MODELS } from '../ai/prompts';
import { logger } from '../utils/logger.util';
import { randomUUID } from 'crypto';

export class GapDetectionService {
  constructor(
    private assessmentRepo: IAssessmentRepository = repositoryFactory.getAssessmentRepository(),
    private gapRepo: IGapDetectionRepository = repositoryFactory.getGapDetectionRepository(),
    private knowledgeRepo: IKnowledgeRepository = repositoryFactory.getKnowledgeRepository()
  ) {}

  async evaluateUserGaps(userId: string): Promise<UserKnowledgeProfile> {
    const latestAssessment = await this.assessmentRepo.getLatestResultByUserId(userId);
    const allModules = await this.knowledgeRepo.getAllModules();

    const gaps: KnowledgeGapItem[] = [];
    const masteredTopics: string[] = [];

    if (latestAssessment) {
      for (const cat of latestAssessment.categoryBreakdown) {
        if (cat.scorePercentage < 70) {
          let severity: GapSeverity = 'medium';
          if (cat.scorePercentage === 0) severity = 'critical';
          else if (cat.scorePercentage < 40) severity = 'high';
          else if (cat.scorePercentage < 60) severity = 'medium';
          else severity = 'low';

          const matchingModule = allModules.find((m) => m.category === cat.category);

          gaps.push({
            id: randomUUID(),
            category: cat.category,
            topicName: cat.categoryName,
            severity,
            scorePercentage: cat.scorePercentage,
            detectedReason: `Scored ${cat.scorePercentage}% in ${cat.categoryName} during diagnostic assessment.`,
            recommendedAction: `Complete the ${matchingModule?.title || cat.categoryName} foundational module.`,
            recommendedModuleId: matchingModule?.id,
          });
        } else {
          masteredTopics.push(cat.categoryName);
        }
      }
    } else {
      // Default baseline gap profile if no diagnostic has been taken yet
      gaps.push({
        id: randomUUID(),
        category: 'budgeting_basics',
        topicName: 'Budgeting & Cashflow Basics',
        severity: 'high',
        scorePercentage: 0,
        detectedReason: 'No diagnostic assessment completed yet.',
        recommendedAction: 'Take the initial diagnostic assessment or complete Budgeting 101.',
        recommendedModuleId: 'mod-budgeting-101',
      });
    }

    const gapSummary = {
      criticalGapsCount: gaps.filter((g) => g.severity === 'critical').length,
      highGapsCount: gaps.filter((g) => g.severity === 'high').length,
      mediumGapsCount: gaps.filter((g) => g.severity === 'medium').length,
      lowGapsCount: gaps.filter((g) => g.severity === 'low').length,
    };

    let aiInsights = 'Focus on building consistent savings habits and completing foundational budgeting lessons.';

    // Enhance with Gemini AI analysis if available
    const ai = getGeminiClient();
    if (ai && gaps.length > 0) {
      try {
        const prompt = `Analyze these financial knowledge gaps for a learner and provide a short, encouraging 2-sentence synthesis with priority actions:
Gaps: ${JSON.stringify(gaps)}
Mastered Topics: ${JSON.stringify(masteredTopics)}`;

        const response = await ai.models.generateContent({
          model: AI_MODELS.FAST,
          contents: prompt,
        });

        if (response.text) {
          aiInsights = response.text.trim();
        }
      } catch (err: any) {
        logger.warn('AI Gap insights generation failed, using fallback:', err.message);
      }
    }

    const profile: UserKnowledgeProfile = {
      userId,
      evaluatedAt: new Date().toISOString(),
      overallLiteracyLevel: latestAssessment?.recommendedLevel || 'beginner',
      gapSummary,
      identifiedGaps: gaps,
      masteredTopics,
      aiInsights,
    };

    await this.gapRepo.saveKnowledgeProfile(profile);
    logger.info(`Evaluated knowledge gaps for user ${userId}. Found ${gaps.length} gaps.`);
    return profile;
  }

  async getLatestProfile(userId: string): Promise<UserKnowledgeProfile | null> {
    const existing = await this.gapRepo.getKnowledgeProfileByUserId(userId);
    if (existing) return existing;
    return this.evaluateUserGaps(userId);
  }
}

export const gapDetectionService = new GapDetectionService();
