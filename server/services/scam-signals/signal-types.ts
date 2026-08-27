import { z } from 'zod';

export type ScamType =
  | 'phishing'
  | 'banking_fraud'
  | 'payment_scam'
  | 'otp_kyc_scam'
  | 'investment_scam'
  | 'crypto_scam'
  | 'loan_scam'
  | 'job_scam'
  | 'lottery_prize_scam'
  | 'impersonation'
  | 'delivery_refund_scam'
  | 'romance_social_engineering'
  | 'malicious_link'
  | 'other'
  | 'benign';

export type RiskSeverity = 'benign' | 'low' | 'moderate' | 'high' | 'critical';

export type SignalCategory =
  | 'financial_pressure'
  | 'credential_harvesting'
  | 'urgency_threats'
  | 'impersonation'
  | 'investment_fraud'
  | 'suspicious_links'
  | 'social_engineering';

export interface DetectedSignal {
  id: string;
  category: SignalCategory;
  name: string;
  severityContribution: number; // Base weight (0 to 50)
  explanation: string;
  evidenceSnippet?: string;
}

export interface ScamEvidence {
  signalName: string;
  category: string;
  snippet: string;
  explanation: string;
}
