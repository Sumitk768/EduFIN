import { z } from 'zod';
import { SUPPORTED_LANGUAGES, LITERACY_LEVELS } from '../config/constants';

export const UserLanguageSchema = z.enum(
  SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]
);

export const LiteracyLevelSchema = z.enum(LITERACY_LEVELS);

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  preferredLanguage: UserLanguageSchema.default('en'),
  literacyLevel: LiteracyLevelSchema.default('beginner'),
  monthlyIncomeCurrency: z.string().default('USD'),
  estimatedMonthlyIncome: z.number().nonnegative().optional(),
  primaryFinancialGoal: z.string().optional(),
  completedAssessment: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateUserRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  preferredLanguage: UserLanguageSchema.optional().default('en'),
  monthlyIncomeCurrency: z.string().optional().default('USD'),
  estimatedMonthlyIncome: z.number().nonnegative().optional(),
  primaryFinancialGoal: z.string().optional(),
});

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredLanguage: UserLanguageSchema.optional(),
  literacyLevel: LiteracyLevelSchema.optional(),
  monthlyIncomeCurrency: z.string().optional(),
  estimatedMonthlyIncome: z.number().nonnegative().optional(),
  primaryFinancialGoal: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateUserRequest = z.input<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.input<typeof UpdateUserRequestSchema>;
