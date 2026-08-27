import { AssessmentQuestion, AssessmentResult } from '../models/assessment.model';
import { INITIAL_ASSESSMENT_QUESTIONS } from '../data/initial-assessments';

export interface IAssessmentRepository {
  getAssessmentQuestions(): Promise<AssessmentQuestion[]>;
  getQuestionById(id: string): Promise<AssessmentQuestion | null>;
  saveResult(result: AssessmentResult): Promise<AssessmentResult>;
  getLatestResultByUserId(userId: string): Promise<AssessmentResult | null>;
  getAllResultsByUserId(userId: string): Promise<AssessmentResult[]>;
}

export class InMemoryAssessmentRepository implements IAssessmentRepository {
  private questions: AssessmentQuestion[] = [...INITIAL_ASSESSMENT_QUESTIONS];
  private results: Map<string, AssessmentResult[]> = new Map();

  async getAssessmentQuestions(): Promise<AssessmentQuestion[]> {
    return this.questions;
  }

  async getQuestionById(id: string): Promise<AssessmentQuestion | null> {
    return this.questions.find((q) => q.id === id) || null;
  }

  async saveResult(result: AssessmentResult): Promise<AssessmentResult> {
    const list = this.results.get(result.userId) || [];
    list.push(result);
    this.results.set(result.userId, list);
    return result;
  }

  async getLatestResultByUserId(userId: string): Promise<AssessmentResult | null> {
    const list = this.results.get(userId);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  async getAllResultsByUserId(userId: string): Promise<AssessmentResult[]> {
    return this.results.get(userId) || [];
  }
}

export const inMemoryAssessmentRepository = new InMemoryAssessmentRepository();
export const assessmentRepository: IAssessmentRepository = inMemoryAssessmentRepository;
