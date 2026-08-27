import {
  ILearningPathRepository,
  IKnowledgeRepository,
  IUserRepository,
  repositoryFactory,
} from '../repositories';
import { gapDetectionService, GapDetectionService } from './gap-detection.service';
import {
  LearningPath,
  LearningStep,
  GenerateLearningPathRequest,
} from '../models/learning-path.model';
import { IAIProvider } from '../ai/ai-provider.interface';
import { getAIProvider } from '../ai/ai.factory';
import { AI_MODELS } from '../ai/prompts';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.util';

export class LearningPathService {
  constructor(
    private pathRepo: ILearningPathRepository = repositoryFactory.getLearningPathRepository(),
    private knowledgeRepo: IKnowledgeRepository = repositoryFactory.getKnowledgeRepository(),
    private gapService: GapDetectionService = gapDetectionService,
    private userRepo: IUserRepository = repositoryFactory.getUserRepository(),
    private aiProvider: IAIProvider = getAIProvider()
  ) {}

  async generateOrGetLearningPath(req: GenerateLearningPathRequest): Promise<LearningPath> {
    const existing = await this.pathRepo.getLearningPathByUserId(req.userId);
    if (existing && !req.focusCategory) {
      return existing;
    }

    const user = await this.userRepo.findById(req.userId);
    const gapProfile = await this.gapService.getLatestProfile(req.userId);
    const allModules = await this.knowledgeRepo.getAllModules(user?.preferredLanguage || 'en');

    const steps: LearningStep[] = [];
    let stepNumber = 1;

    // Prioritize critical and high severity gaps first
    const prioritizedCategories = gapProfile?.identifiedGaps
      .sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityWeight[b.severity] - severityWeight[a.severity];
      })
      .map((g) => g.category) || ['budgeting_basics', 'emergency_savings', 'fraud_and_scam_protection'];

    for (const cat of prioritizedCategories) {
      const module = allModules.find((m) => m.category === cat);
      if (module) {
        for (const lesson of module.lessons) {
          // Strictly ground steps in real verified curriculum modules and lessons
          steps.push({
            id: `step-${randomUUID().substring(0, 8)}`,
            stepNumber: stepNumber++,
            title: lesson.title,
            description: lesson.summary,
            category: module.category,
            targetModuleId: module.id,
            estimatedMinutes: lesson.estimatedMinutes,
            status: 'not_started',
            skillsTaught: lesson.keyTakeaways,
          });
        }
      }
    }

    // If still empty, add default modules
    if (steps.length === 0) {
      for (const module of allModules) {
        for (const lesson of module.lessons) {
          steps.push({
            id: `step-${randomUUID().substring(0, 8)}`,
            stepNumber: stepNumber++,
            title: lesson.title,
            description: lesson.summary,
            category: module.category,
            targetModuleId: module.id,
            estimatedMinutes: lesson.estimatedMinutes,
            status: 'not_started',
            skillsTaught: lesson.keyTakeaways,
          });
        }
      }
    }

    const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
    const fallbackRationale = `Designed around identified gaps in ${prioritizedCategories.join(', ')} with a commitment of ~${req.weeklyTimeCommitmentMinutes} mins/week.`;
    let personalizedRationale = fallbackRationale;

    // Enhance personalized rationale using AI provider
    try {
      const prompt = `You are a financial learning path advisor. Write a concise 2-sentence encouraging, personalized study rationale for a learner with literacy level "${user?.literacyLevel || 'beginner'}".
Identified priority gap topics: ${prioritizedCategories.join(', ')}.
Weekly commitment: ${req.weeklyTimeCommitmentMinutes} minutes.
Focus category: ${req.focusCategory || 'Comprehensive foundational mastery'}.`;

      const result = await this.aiProvider.generateText({
        prompt,
        model: AI_MODELS.FAST,
        operationName: 'generateLearningPathRationale',
        fallback: () => fallbackRationale,
      });

      if (result.text && result.text.trim().length > 0) {
        personalizedRationale = result.text.trim();
      }
    } catch (err: any) {
      logger.warn('AI Learning Path rationale generation failed, using fallback:', err.message);
    }

    const learningPath: LearningPath = {
      id: randomUUID(),
      userId: req.userId,
      title: `${user?.name ? user.name + "'s " : ''}Personalized Financial Mastery Plan`,
      targetLevel: user?.literacyLevel || 'beginner',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalEstimatedMinutes: totalMinutes,
      completedStepsCount: 0,
      totalStepsCount: steps.length,
      progressPercentage: 0,
      steps,
      personalizedRationale,
    };

    await this.pathRepo.saveLearningPath(learningPath);
    logger.info(`Generated learning path for user ${req.userId} with ${steps.length} steps.`);
    return learningPath;
  }

  async getPath(userId: string): Promise<LearningPath | null> {
    const path = await this.pathRepo.getLearningPathByUserId(userId);
    if (path) return path;
    return this.generateOrGetLearningPath({ userId, weeklyTimeCommitmentMinutes: 60 });
  }

  async updateStep(
    userId: string,
    stepId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<LearningPath | null> {
    return this.pathRepo.updateStepStatus(userId, stepId, status);
  }
}

export const learningPathService = new LearningPathService();
