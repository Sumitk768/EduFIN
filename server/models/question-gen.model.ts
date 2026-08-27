import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS, SUPPORTED_LANGUAGES } from '../config/constants';

export const GenerateQuestionsRequestSchema = z.object({
  category: z.enum(FINANCIAL_CATEGORIES),
  difficulty: z.enum(LITERACY_LEVELS).default('beginner'),
  count: z.number().int().min(1).max(10).default(3),
  language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default('en'),
  scenarioType: z.enum(['practical_scenario', 'conceptual_definition', 'math_calculation', 'scam_identification']).default('practical_scenario'),
  customTopicFocus: z.string().optional(),
});

export const GeneratedQuestionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  questionText: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  difficulty: z.enum(LITERACY_LEVELS),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ),
  correctOptionId: z.string(),
  detailedExplanation: z.string(),
  practicalTip: z.string(),
});

export const ValidateGeneratedAnswerRequestSchema = z.object({
  questionId: z.string(),
  selectedOptionId: z.string(),
  correctOptionId: z.string(),
  detailedExplanation: z.string(),
});

export type GenerateQuestionsRequest = z.infer<typeof GenerateQuestionsRequestSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type ValidateGeneratedAnswerRequest = z.infer<typeof ValidateGeneratedAnswerRequestSchema>;
