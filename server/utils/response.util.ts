import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
    [key: string]: any;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  extraMeta?: Record<string, any>
): Response {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...extraMeta,
    },
  };
  return res.status(statusCode).json(responsePayload);
}

export function sendError(
  res: Response,
  errorCode: string,
  errorMessage: string,
  statusCode: number = 400,
  details?: any
): Response {
  const responsePayload: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
  return res.status(statusCode).json(responsePayload);
}

export function sendNotImplemented(
  res: Response,
  featureName: string,
  details?: string
): Response {
  return sendError(
    res,
    'NOT_IMPLEMENTED',
    `The requested capability [${featureName}] is marked for future implementation.`,
    501,
    {
      feature: featureName,
      status: 'planned',
      documentation: details || 'Planned for future iteration phase.',
    }
  );
}
