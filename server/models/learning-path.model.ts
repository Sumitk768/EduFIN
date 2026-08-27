import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS } from '../config/constants';

export const MilestoneStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);

export const LearningStepSchema = z.object({
  id: z.string(),
  stepNumber: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  targetModuleId: z.string(),
  estimatedMinutes: z.number().int(),
  status: MilestoneStatusSchema.default('not_started'),
  skillsTaught: z.array(z.string()),
});

export const LearningPathSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  targetLevel: z.enum(LITERACY_LEVELS),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  totalEstimatedMinutes: z.number(),
  completedStepsCount: z.number().default(0),
  totalStepsCount: z.number(),
  progressPercentage: z.number().default(0),
  steps: z.array(LearningStepSchema),
  personalizedRationale: z.string(),
});

export const GenerateLearningPathRequestSchema = z.object({
  userId: z.string().uuid(),
  focusCategory: z.enum(FINANCIAL_CATEGORIES).optional(),
  weeklyTimeCommitmentMinutes: z.number().int().min(15).max(1000).default(60),
});

export type LearningStep = z.infer<typeof LearningStepSchema>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
export type GenerateLearningPathRequest = z.infer<typeof GenerateLearningPathRequestSchema>;
