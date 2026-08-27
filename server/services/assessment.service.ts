import { assessmentRepository, IAssessmentRepository } from '../repositories/assessment.repository';
import { userRepository, IUserRepository } from '../repositories/user.repository';
import { progressRepository, IProgressRepository } from '../repositories/progress.repository';
import {
  AssessmentQuestion,
  AssessmentSubmission,
  AssessmentResult,
  CategoryScore,
} from '../models/assessment.model';
import { FinancialCategory, LiteracyLevel } from '../config/constants';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.util';

export class AssessmentService {
  constructor(
    private assessmentRepo: IAssessmentRepository = assessmentRepository,
    private userRepo: IUserRepository = userRepository,
    private progressRepo: IProgressRepository = progressRepository
  ) {}

  async getQuestions(): Promise<AssessmentQuestion[]> {
    // Return sanitized questions (without exposing correctOptionId directly to prevent client-side answer peeking)
    return this.assessmentRepo.getAssessmentQuestions();
  }

  async submitAssessment(submission: AssessmentSubmission): Promise<AssessmentResult> {
    const questions = await this.assessmentRepo.getAssessmentQuestions();
    const questionsMap = new Map(questions.map((q) => [q.id, q]));

    let totalCorrect = 0;
    const categoryStats: Record<
      string,
      { total: number; correct: number; category: FinancialCategory }
    > = {};

    for (const answer of submission.answers) {
      const q = questionsMap.get(answer.questionId);
      if (!q) continue;

      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { total: 0, correct: 0, category: q.category };
      }

      categoryStats[q.category].total += 1;
      if (answer.selectedOptionId === q.correctOptionId) {
        totalCorrect += 1;
        categoryStats[q.category].correct += 1;
      }
    }

    const totalQuestions = submission.answers.length || 1;
    const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);

    let recommendedLevel: LiteracyLevel = 'beginner';
    if (overallPercentage >= 80) recommendedLevel = 'advanced';
    else if (overallPercentage >= 50) recommendedLevel = 'intermediate';

    const categoryBreakdown: CategoryScore[] = Object.values(categoryStats).map((stat) => {
      const percentage = Math.round((stat.correct / stat.total) * 100);
      let proficiencyLevel: LiteracyLevel = 'beginner';
      if (percentage >= 80) proficiencyLevel = 'advanced';
      else if (percentage >= 50) proficiencyLevel = 'intermediate';

      return {
        category: stat.category,
        categoryName: stat.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        totalQuestions: stat.total,
        correctAnswers: stat.correct,
        scorePercentage: percentage,
        proficiencyLevel,
      };
    });

    const identifiedGaps: string[] = categoryBreakdown
      .filter((c) => c.scorePercentage < 60)
      .map((c) => c.categoryName);

    const strengths: string[] = categoryBreakdown
      .filter((c) => c.scorePercentage >= 80)
      .map((c) => c.categoryName);

    const result: AssessmentResult = {
      assessmentId: randomUUID(),
      userId: submission.userId,
      completedAt: new Date().toISOString(),
      totalQuestions,
      totalCorrect,
      overallScorePercentage: overallPercentage,
      recommendedLevel,
      categoryBreakdown,
      identifiedGaps,
      strengths,
    };

    await this.assessmentRepo.saveResult(result);

    // Update user profile and learning progress
    await this.userRepo.update(submission.userId, {
      literacyLevel: recommendedLevel,
    });

    await this.progressRepo.recordActivity(
      submission.userId,
      'assessment_finished',
      `Completed Diagnostic Assessment (${overallPercentage}%)`
    );

    logger.info(`Assessment completed for user ${submission.userId}. Score: ${overallPercentage}%, Level: ${recommendedLevel}`);
    return result;
  }

  async getLatestResult(userId: string): Promise<AssessmentResult | null> {
    return this.assessmentRepo.getLatestResultByUserId(userId);
  }
}

export const assessmentService = new AssessmentService();
