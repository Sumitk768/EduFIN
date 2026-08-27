import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../config/constants';

export const ScamTypeEnum = z.enum([
  'phishing',
  'banking_fraud',
  'payment_scam',
  'otp_kyc_scam',
  'investment_scam',
  'crypto_scam',
  'loan_scam',
  'job_scam',
  'lottery_prize_scam',
  'impersonation',
  'delivery_refund_scam',
  'romance_social_engineering',
  'malicious_link',
  'other',
  'benign',
]);

export const RiskSeverityEnum = z.enum(['benign', 'low', 'moderate', 'high', 'critical']);
export const LegacyRiskLevelEnum = z.enum(['safe', 'suspicious', 'dangerous', 'critical_scam']);

export const SignalCategoryEnum = z.enum([
  'financial_pressure',
  'credential_harvesting',
  'urgency_threats',
  'impersonation',
  'investment_fraud',
  'suspicious_links',
  'social_engineering',
]);

export const DetectedSignalSchema = z.object({
  id: z.string(),
  category: SignalCategoryEnum,
  name: z.string(),
  severityContribution: z.number().min(0).max(100),
  explanation: z.string(),
  evidenceSnippet: z.string().optional(),
});

export const ScamEvidenceSchema = z.object({
  signalName: z.string(),
  category: z.string(),
  snippet: z.string(),
  explanation: z.string(),
});

export const CheckScamRequestSchema = z.object({
  messageText: z.string().min(3, 'Message must have at least 3 characters').max(4000).optional(),
  message: z.string().min(3, 'Message must have at least 3 characters').max(4000).optional(),
  senderInfo: z.string().max(200).optional(),
  channel: z.enum(['sms', 'email', 'whatsapp', 'social_media', 'phone_call', 'other']).default('sms').optional(),
  language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default('en').optional(),
  persistHistory: z.boolean().default(false).optional(),
}).refine((data) => !!(data.messageText || data.message), {
  message: 'Either messageText or message field must be provided',
});

export const AIScamAnalysisResponseSchema = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    const riskScore = val.riskScore !== undefined ? val.riskScore : (val.scamRiskScore !== undefined ? val.scamRiskScore : 50);
    const scamType = val.scamType || (val.detectedScamType ? 'banking_fraud' : 'other');
    const severity = val.severity || (riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 30 ? 'moderate' : 'low');
    const recommendedActions = val.recommendedActions || val.safeActionRecommendations || [];
    const preventionTips = val.preventionTips || ['Verify senders independently through official channels'];
    const confidence = val.confidence !== undefined ? val.confidence : 0.9;
    return {
      ...val,
      riskScore,
      scamType,
      severity,
      recommendedActions,
      preventionTips,
      confidence,
    };
  }
  return val;
}, z.object({
  scamType: z.string(),
  riskScore: z.number().min(0).max(100),
  severity: z.string(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  redFlags: z.array(z.string()),
  urgencyTacticDetected: z.boolean(),
  recommendedActions: z.array(z.string()),
  preventionTips: z.array(z.string()),
}));

export const ScamAnalysisResultSchema = z.object({
  riskScore: z.number().min(0).max(100),
  scamRiskScore: z.number().min(0).max(100), // Backwards compatibility alias
  severity: RiskSeverityEnum,
  riskLevel: LegacyRiskLevelEnum, // Backwards compatibility alias
  scamType: ScamTypeEnum,
  detectedScamType: z.string(), // Backwards compatibility alias
  confidence: z.number().min(0).max(1),
  redFlags: z.array(z.string()),
  detectedSignals: z.array(DetectedSignalSchema),
  evidence: z.array(ScamEvidenceSchema),
  suspiciousElementsFound: z.array(
    z.object({
      element: z.string(),
      reason: z.string(),
    })
  ),
  explanation: z.string(),
  urgencyTacticDetected: z.boolean(),
  recommendedActions: z.array(z.string()),
  safeActionRecommendations: z.array(z.string()), // Backwards compatibility alias
  preventionTips: z.array(z.string()),
  helplineOrReportingAdvice: z.string(),
  disclaimer: z.string(),
  analyzedAt: z.string(),
});

export type CheckScamRequest = z.infer<typeof CheckScamRequestSchema>;
export type ScamAnalysisResult = z.infer<typeof ScamAnalysisResultSchema>;
export type AIScamAnalysisResponse = z.infer<typeof AIScamAnalysisResponseSchema>;
