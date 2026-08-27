import { z } from 'zod';
import { FINANCIAL_CATEGORIES, LITERACY_LEVELS, SUPPORTED_LANGUAGES } from '../config/constants';

export const KnowledgeGlossaryTermSchema = z.object({
  id: z.string(),
  term: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  definition: z.string(),
  simpleAnalogy: z.string(),
  example: z.string(),
  language: z.string(),
});

export const KnowledgeLessonSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  estimatedMinutes: z.number().int().min(1),
  order: z.number().int(),
  summary: z.string(),
  contentMarkdown: z.string(),
  keyTakeaways: z.array(z.string()),
  actionableTip: z.string(),
  glossaryTerms: z.array(z.string()),
});

export const KnowledgeModuleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: z.enum(FINANCIAL_CATEGORIES),
  level: z.enum(LITERACY_LEVELS),
  title: z.string(),
  description: z.string(),
  iconName: z.string(),
  language: z.string().default('en'),
  lessons: z.array(KnowledgeLessonSchema),
  totalLessons: z.number(),
  estimatedTotalMinutes: z.number(),
});

export type KnowledgeGlossaryTerm = z.infer<typeof KnowledgeGlossaryTermSchema>;
export type KnowledgeLesson = z.infer<typeof KnowledgeLessonSchema>;
export type KnowledgeModule = z.infer<typeof KnowledgeModuleSchema>;
