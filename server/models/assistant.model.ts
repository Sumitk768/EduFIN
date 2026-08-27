import { z } from 'zod';
import { SUPPORTED_LANGUAGES, FINANCIAL_CATEGORIES } from '../config/constants';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

export const AssistantQueryRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default('en'),
  userLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  conversationHistory: z.array(ChatMessageSchema).max(20, 'Conversation history cannot exceed 20 turns').optional().default([]),
  contextCategory: z.enum(FINANCIAL_CATEGORIES).optional(),
});

export const AssistantResponseSchema = z.object({
  reply: z.string(),
  detectedLanguage: z.string(),
  keyTakeaways: z.array(z.string()).optional(),
  suggestedFollowUps: z.array(z.string()),
  relatedGlossaryTerms: z.array(z.string()).optional(),
  disclaimer: z.string(),
});

export const ExplainTermRequestSchema = z.object({
  term: z.string().min(1).max(100),
  language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).default('en'),
  targetLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AssistantQueryRequest = z.infer<typeof AssistantQueryRequestSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
export type ExplainTermRequest = z.infer<typeof ExplainTermRequestSchema>;
