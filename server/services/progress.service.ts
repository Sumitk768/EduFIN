import { progressRepository, IProgressRepository } from '../repositories/progress.repository';
import { RecordLessonCompletion, RecordQuizScore, UserProgressSummary } from '../models/progress.model';
import { knowledgeRepository } from '../repositories/knowledge.repository';
import { logger } from '../utils/logger.util';

export class ProgressService {
  constructor(private repo: IProgressRepository = progressRepository) {}

  async getUserProgress(userId: string): Promise<UserProgressSummary> {
    return this.repo.getUserProgress(userId);
  }

  async recordLessonCompletion(record: RecordLessonCompletion): Promise<UserProgressSummary> {
    const module = await knowledgeRepository.getModuleById(record.moduleId);
    const category = module?.category || 'budgeting_basics';

    const lesson = module?.lessons.find((l) => l.id === record.lessonId);
    const lessonTitle = lesson?.title || 'Financial Literacy Lesson';

    await this.repo.recordActivity(
      record.userId,
      'lesson_completed',
      `Completed lesson: ${lessonTitle}`
    );

    logger.info(`Recorded lesson completion for user ${record.userId} (Lesson: ${lessonTitle})`);
    return this.repo.incrementLessonCompletion(record.userId, category);
  }

  async recordQuizScore(record: RecordQuizScore): Promise<UserProgressSummary> {
    await this.repo.recordActivity(
      record.userId,
      'quiz_passed',
      `Scored ${record.scorePercentage}% in ${record.category.replace(/_/g, ' ')} quiz`
    );

    logger.info(`Recorded quiz score for user ${record.userId}: ${record.scorePercentage}%`);
    return this.repo.recordQuizScore(record.userId, record.category, record.scorePercentage);
  }
}

export const progressService = new ProgressService();
