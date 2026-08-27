import { IUserRepository, InMemoryUserRepository } from './user.repository';
import { PostgresUserRepository } from './postgres-user.repository';
import { IKnowledgeRepository, InMemoryKnowledgeRepository } from './knowledge.repository';
import { PostgresKnowledgeRepository } from './postgres-knowledge.repository';
import { IAssessmentRepository, InMemoryAssessmentRepository } from './assessment.repository';
import { PostgresAssessmentRepository } from './postgres-assessment.repository';
import { IGapDetectionRepository, InMemoryGapDetectionRepository } from './gap-detection.repository';
import { PostgresGapDetectionRepository } from './postgres-gap-detection.repository';
import { ILearningPathRepository, InMemoryLearningPathRepository } from './learning-path.repository';
import { PostgresLearningPathRepository } from './postgres-learning-path.repository';
import { IProgressRepository, InMemoryProgressRepository } from './progress.repository';
import { PostgresProgressRepository } from './postgres-progress.repository';
import { IScamAnalysisRepository, InMemoryScamAnalysisRepository } from './scam-analysis.repository';
import { PostgresScamAnalysisRepository } from './postgres-scam-analysis.repository';
import { isDatabaseConfigured } from '../db/index';

export type RepositoryMode = 'postgres' | 'in_memory' | 'auto';

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private mode: RepositoryMode = 'auto';

  private userRepo?: IUserRepository;
  private knowledgeRepo?: IKnowledgeRepository;
  private assessmentRepo?: IAssessmentRepository;
  private gapDetectionRepo?: IGapDetectionRepository;
  private learningPathRepo?: ILearningPathRepository;
  private progressRepo?: IProgressRepository;
  private scamAnalysisRepo?: IScamAnalysisRepository;

  private constructor() {}

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  public setMode(mode: RepositoryMode): void {
    this.mode = mode;
    this.reset();
  }

  public getMode(): RepositoryMode {
    return this.mode;
  }

  public shouldUsePostgres(): boolean {
    if (this.mode === 'postgres') return true;
    if (this.mode === 'in_memory') return false;
    return isDatabaseConfigured();
  }

  public getUserRepository(): IUserRepository {
    if (!this.userRepo) {
      this.userRepo = this.shouldUsePostgres()
        ? new PostgresUserRepository()
        : new InMemoryUserRepository();
    }
    return this.userRepo;
  }

  public getKnowledgeRepository(): IKnowledgeRepository {
    if (!this.knowledgeRepo) {
      this.knowledgeRepo = this.shouldUsePostgres()
        ? new PostgresKnowledgeRepository()
        : new InMemoryKnowledgeRepository();
    }
    return this.knowledgeRepo;
  }

  public getAssessmentRepository(): IAssessmentRepository {
    if (!this.assessmentRepo) {
      this.assessmentRepo = this.shouldUsePostgres()
        ? new PostgresAssessmentRepository()
        : new InMemoryAssessmentRepository();
    }
    return this.assessmentRepo;
  }

  public getGapDetectionRepository(): IGapDetectionRepository {
    if (!this.gapDetectionRepo) {
      this.gapDetectionRepo = this.shouldUsePostgres()
        ? new PostgresGapDetectionRepository()
        : new InMemoryGapDetectionRepository();
    }
    return this.gapDetectionRepo;
  }

  public getLearningPathRepository(): ILearningPathRepository {
    if (!this.learningPathRepo) {
      this.learningPathRepo = this.shouldUsePostgres()
        ? new PostgresLearningPathRepository()
        : new InMemoryLearningPathRepository();
    }
    return this.learningPathRepo;
  }

  public getProgressRepository(): IProgressRepository {
    if (!this.progressRepo) {
      this.progressRepo = this.shouldUsePostgres()
        ? new PostgresProgressRepository()
        : new InMemoryProgressRepository();
    }
    return this.progressRepo;
  }

  public getScamAnalysisRepository(): IScamAnalysisRepository {
    if (!this.scamAnalysisRepo) {
      this.scamAnalysisRepo = this.shouldUsePostgres()
        ? new PostgresScamAnalysisRepository()
        : new InMemoryScamAnalysisRepository();
    }
    return this.scamAnalysisRepo;
  }

  public reset(): void {
    this.userRepo = undefined;
    this.knowledgeRepo = undefined;
    this.assessmentRepo = undefined;
    this.gapDetectionRepo = undefined;
    this.learningPathRepo = undefined;
    this.progressRepo = undefined;
    this.scamAnalysisRepo = undefined;
  }
}

export const repositoryFactory = RepositoryFactory.getInstance();
