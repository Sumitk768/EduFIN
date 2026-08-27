import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS } from '../config/constants';

export const GapSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type GapSeverity = z.infer<typeof GapSeveritySchema>;

export const KnowledgeGapItemSchema = z.object({
  id: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  topicName: z.string(),
  severity: GapSeveritySchema,
  scorePercentage: z.number(),
  detectedReason: z.string(),
  recommendedAction: z.string(),
  recommendedModuleId: z.string().optional(),
});

export const UserKnowledgeProfileSchema = z.object({
  userId: z.string().uuid(),
  evaluatedAt: z.string().datetime(),
  overallLiteracyLevel: z.enum(LITERACY_LEVELS),
  gapSummary: z.object({
    criticalGapsCount: z.number(),
    highGapsCount: z.number(),
    mediumGapsCount: z.number(),
    lowGapsCount: z.number(),
  }),
  identifiedGaps: z.array(KnowledgeGapItemSchema),
  masteredTopics: z.array(z.string()),
  aiInsights: z.string().optional(),
});

export type KnowledgeGapItem = z.infer<typeof KnowledgeGapItemSchema>;
export type UserKnowledgeProfile = z.infer<typeof UserKnowledgeProfileSchema>;
