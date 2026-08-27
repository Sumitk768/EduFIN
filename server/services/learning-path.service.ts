import { learningPathRepository, ILearningPathRepository } from '../repositories/learning-path.repository';
import { knowledgeRepository, IKnowledgeRepository } from '../repositories/knowledge.repository';
import { gapDetectionService, GapDetectionService } from './gap-detection.service';
import { userRepository, IUserRepository } from '../repositories/user.repository';
import {
  LearningPath,
  LearningStep,
  GenerateLearningPathRequest,
} from '../models/learning-path.model';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.util';

export class LearningPathService {
  constructor(
    private pathRepo: ILearningPathRepository = learningPathRepository,
    private knowledgeRepo: IKnowledgeRepository = knowledgeRepository,
    private gapService: GapDetectionService = gapDetectionService,
    private userRepo: IUserRepository = userRepository
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
      personalizedRationale: `Designed around identified gaps in ${prioritizedCategories.join(', ')} with a commitment of ~${req.weeklyTimeCommitmentMinutes} mins/week.`,
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
