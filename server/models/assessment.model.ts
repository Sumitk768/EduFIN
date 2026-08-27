import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS } from '../config/constants';

export const AssessmentQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  difficulty: z.enum(LITERACY_LEVELS),
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ),
  explanation: z.string(),
  correctOptionId: z.string(),
});

export const AssessmentSubmissionSchema = z.object({
  userId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string(),
    })
  ),
});

export const CategoryScoreSchema = z.object({
  category: z.enum(FINANCIAL_CATEGORIES),
  categoryName: z.string(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  scorePercentage: z.number(),
  proficiencyLevel: z.enum(LITERACY_LEVELS),
});

export const AssessmentResultSchema = z.object({
  assessmentId: z.string().uuid(),
  userId: z.string().uuid(),
  completedAt: z.string().datetime(),
  totalQuestions: z.number(),
  totalCorrect: z.number(),
  overallScorePercentage: z.number(),
  recommendedLevel: z.enum(LITERACY_LEVELS),
  categoryBreakdown: z.array(CategoryScoreSchema),
  identifiedGaps: z.array(z.string()),
  strengths: z.array(z.string()),
});

export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AssessmentSubmission = z.infer<typeof AssessmentSubmissionSchema>;
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
