import { ScamAnalysisResult } from '../models/scam-checker.model';

export interface StoredScamAnalysis {
  id: string;
  userId?: string | null;
  messageText: string;
  senderInfo?: string | null;
  channel: string;
  language: string;
  scamRiskScore: number;
  riskLevel: string;
  detectedScamType: string;
  redFlags: string[];
  explanation: string;
  urgencyTacticDetected: boolean;
  suspiciousElementsFound: any[];
  safeActionRecommendations: string[];
  helplineOrReportingAdvice: string;
  createdAt: string;
}

export interface IScamAnalysisRepository {
  create(
    data: {
      userId?: string | null;
      messageText: string;
      senderInfo?: string | null;
      channel: string;
      language: string;
      result: ScamAnalysisResult;
    }
  ): Promise<StoredScamAnalysis>;

  findByUserId(userId: string, limit?: number): Promise<StoredScamAnalysis[]>;
  findById(id: string): Promise<StoredScamAnalysis | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

export class InMemoryScamAnalysisRepository implements IScamAnalysisRepository {
  private analyses: StoredScamAnalysis[] = [];

  async create(data: {
    userId?: string | null;
    messageText: string;
    senderInfo?: string | null;
    channel: string;
    language: string;
    result: ScamAnalysisResult;
  }): Promise<StoredScamAnalysis> {
    const id = `scam-analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stored: StoredScamAnalysis = {
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
      createdAt: new Date().toISOString(),
    };

    this.analyses.unshift(stored);
    return stored;
  }

  async findByUserId(userId: string, limit: number = 50): Promise<StoredScamAnalysis[]> {
    return this.analyses.filter((a) => a.userId === userId).slice(0, limit);
  }

  async findById(id: string): Promise<StoredScamAnalysis | null> {
    return this.analyses.find((a) => a.id === id) || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const index = this.analyses.findIndex((a) => a.id === id && a.userId === userId);
    if (index === -1) return false;
    this.analyses.splice(index, 1);
    return true;
  }
}
