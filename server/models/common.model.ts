import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  language: z.string().optional().default('en'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
