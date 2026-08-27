import { LearningPath, LearningStep } from '../models/learning-path.model';

export interface ILearningPathRepository {
  saveLearningPath(path: LearningPath): Promise<LearningPath>;
  getLearningPathByUserId(userId: string): Promise<LearningPath | null>;
  updateStepStatus(userId: string, stepId: string, status: 'not_started' | 'in_progress' | 'completed'): Promise<LearningPath | null>;
}

export class InMemoryLearningPathRepository implements ILearningPathRepository {
  private paths: Map<string, LearningPath> = new Map();

  async saveLearningPath(path: LearningPath): Promise<LearningPath> {
    this.paths.set(path.userId, path);
    return path;
  }

  async getLearningPathByUserId(userId: string): Promise<LearningPath | null> {
    return this.paths.get(userId) || null;
  }

  async updateStepStatus(
    userId: string,
    stepId: string,
    status: 'not_started' | 'in_progress' | 'completed'
  ): Promise<LearningPath | null> {
    const path = this.paths.get(userId);
    if (!path) return null;

    const stepIndex = path.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return null;

    path.steps[stepIndex].status = status;
    const completedCount = path.steps.filter((s) => s.status === 'completed').length;
    path.completedStepsCount = completedCount;
    path.progressPercentage = Math.round((completedCount / path.totalStepsCount) * 100);
    path.updatedAt = new Date().toISOString();

    this.paths.set(userId, path);
    return path;
  }
}

export const inMemoryLearningPathRepository = new InMemoryLearningPathRepository();
export const learningPathRepository: ILearningPathRepository = inMemoryLearningPathRepository;
