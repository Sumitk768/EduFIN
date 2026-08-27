import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(`Unhandled Error [${req.method} ${req.originalUrl}]:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected internal server error occurred.';

  return sendError(
    res,
    errorCode,
    errorMessage,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
}

export function notFoundHandler(req: Request, res: Response) {
  return sendError(
    res,
    'NOT_FOUND',
    `Resource not found for route: ${req.method} ${req.originalUrl}`,
    404
  );
}
