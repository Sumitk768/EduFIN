import { z } from 'zod';
import { UserLanguageSchema, UserProfileSchema } from './user.model';

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  email: z.string().email('Valid email address is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password must be at most 100 characters long'),
  preferredLanguage: UserLanguageSchema.optional().default('en'),
  monthlyIncomeCurrency: z.string().optional().default('USD'),
  estimatedMonthlyIncome: z.number().nonnegative('Income must be non-negative').optional(),
  primaryFinancialGoal: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  token: z.string(),
  expiresIn: z.string(),
});

export const JwtPayloadSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export type RegisterRequest = z.input<typeof RegisterRequestSchema>;
export type LoginRequest = z.input<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
