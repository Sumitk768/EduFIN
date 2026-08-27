import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../config/constants';

export const CheckScamRequestSchema = z.object({
  messageText: z.string().min(3, 'Message must have at least 3 characters').max(4000),
  senderInfo: z.string().max(200).optional(),
  channel: z.enum(['sms', 'email', 'whatsapp', 'social_media', 'phone_call', 'other']).default('sms'),
  language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default('en'),
});

export const ScamAnalysisResultSchema = z.object({
  scamRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['safe', 'suspicious', 'dangerous', 'critical_scam']),
  detectedScamType: z.string(),
  redFlags: z.array(z.string()),
  explanation: z.string(),
  urgencyTacticDetected: z.boolean(),
  suspiciousElementsFound: z.array(
    z.object({
      element: z.string(),
      reason: z.string(),
    })
  ),
  safeActionRecommendations: z.array(z.string()),
  helplineOrReportingAdvice: z.string(),
  verifiedAuthenticityIndicators: z.array(z.string()).optional(),
});

export type CheckScamRequest = z.infer<typeof CheckScamRequestSchema>;
export type ScamAnalysisResult = z.infer<typeof ScamAnalysisResultSchema>;
