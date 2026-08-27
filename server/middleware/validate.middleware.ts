import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.util';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.issues || (err as any).errors || [];
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid request payload.',
          422,
          issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      return sendError(res, 'VALIDATION_ERROR', 'Request validation failed.', 422, err.message);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.issues || (err as any).errors || [];
        return sendError(
          res,
          'QUERY_VALIDATION_ERROR',
          'Invalid query parameters.',
          422,
          issues.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      return sendError(res, 'QUERY_VALIDATION_ERROR', 'Query validation failed.', 422, err.message);
    }
  };
}
