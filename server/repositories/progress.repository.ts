import { UserProgressSummary, Badge } from '../models/progress.model';
import { randomUUID } from 'crypto';

export interface IProgressRepository {
  getUserProgress(userId: string): Promise<UserProgressSummary>;
  recordActivity(userId: string, activityType: 'lesson_completed' | 'quiz_passed' | 'streak_extended' | 'assessment_finished', title: string): Promise<void>;
  incrementLessonCompletion(userId: string, category: string): Promise<UserProgressSummary>;
  recordQuizScore(userId: string, category: string, score: number): Promise<UserProgressSummary>;
}

const DEFAULT_BADGES: Badge[] = [
  { id: 'b-first-step', name: 'First Financial Step', description: 'Completed your very first financial literacy lesson', icon: 'award' },
  { id: 'b-budget-master', name: 'Budget Architect', description: 'Mastered the 50/30/20 allocation principles', icon: 'wallet' },
  { id: 'b-scam-shield', name: 'Fraud Shield', description: 'Successfully detected 3 fraudulent scam messages', icon: 'shield-check' },
  { id: 'b-compound-wizard', name: 'Compounding Wizard', description: 'Simulated and understood long-term wealth growth', icon: 'trending-up' },
  { id: 'b-streak-7', name: '7-Day Financial Streak', description: 'Maintained continuous daily learning for 7 days', icon: 'zap' },
];

class InMemoryProgressRepository implements IProgressRepository {
  private progressStore: Map<string, UserProgressSummary> = new Map();

  private getOrCreate(userId: string): UserProgressSummary {
    let prog = this.progressStore.get(userId);
    if (!prog) {
      prog = {
        userId,
        currentLevel: 'beginner',
        completedLessonsCount: 0,
        completedQuizzesCount: 0,
        averageQuizScorePercentage: 0,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        categoryProficiencies: {
          budgeting_basics: 10,
          emergency_savings: 5,
          banking_services: 0,
          debt_and_credit: 0,
          investing_fundamentals: 0,
          retirement_planning: 0,
          taxation_and_deductions: 0,
          fraud_and_scam_protection: 15,
          insurance_basics: 0,
        },
        earnedBadges: [DEFAULT_BADGES[0]],
        recentActivities: [
          {
            id: randomUUID(),
            activityType: 'assessment_finished',
            title: 'Diagnostic Financial Literacy Evaluation',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      this.progressStore.set(userId, prog);
    }
    return prog;
  }

  async getUserProgress(userId: string): Promise<UserProgressSummary> {
    return this.getOrCreate(userId);
  }

  async recordActivity(
    userId: string,
    activityType: 'lesson_completed' | 'quiz_passed' | 'streak_extended' | 'assessment_finished',
    title: string
  ): Promise<void> {
    const prog = this.getOrCreate(userId);
    prog.recentActivities.unshift({
      id: randomUUID(),
      activityType,
      title,
      timestamp: new Date().toISOString(),
    });
    if (prog.recentActivities.length > 20) {
      prog.recentActivities = prog.recentActivities.slice(0, 20);
    }
    this.progressStore.set(userId, prog);
  }

  async incrementLessonCompletion(userId: string, category: string): Promise<UserProgressSummary> {
    const prog = this.getOrCreate(userId);
    prog.completedLessonsCount += 1;
    const currentCatScore = prog.categoryProficiencies[category] || 0;
    prog.categoryProficiencies[category] = Math.min(100, currentCatScore + 15);

    if (prog.completedLessonsCount >= 5 && !prog.earnedBadges.some((b) => b.id === 'b-budget-master')) {
      prog.earnedBadges.push({ ...DEFAULT_BADGES[1], unlockedAt: new Date().toISOString() });
    }

    this.progressStore.set(userId, prog);
    return prog;
  }

  async recordQuizScore(userId: string, category: string, score: number): Promise<UserProgressSummary> {
    const prog = this.getOrCreate(userId);
    const totalPrior = prog.completedQuizzesCount;
    const currentAvg = prog.averageQuizScorePercentage;
    const newTotal = totalPrior + 1;
    const newAvg = Math.round(((currentAvg * totalPrior + score) / newTotal) * 10) / 10;

    prog.completedQuizzesCount = newTotal;
    prog.averageQuizScorePercentage = newAvg;

    const currentCatScore = prog.categoryProficiencies[category] || 0;
    const weight = score >= 70 ? 20 : 5;
    prog.categoryProficiencies[category] = Math.min(100, currentCatScore + weight);

    this.progressStore.set(userId, prog);
    return prog;
  }
}

export const progressRepository = new InMemoryProgressRepository();
