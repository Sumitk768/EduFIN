import { Request, Response, NextFunction } from 'express';
import { authService, AuthenticationError } from '../services/auth.service';
import { sendError } from '../utils/response.util';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// Extend global Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that validates the JWT bearer token from the Authorization header
 * and attaches the authenticated user identity to req.user.
 */
export function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(
      res,
      'MISSING_AUTH_TOKEN',
      'Authorization header is required. Please provide a valid Bearer token.',
      401
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      'MALFORMED_AUTH_HEADER',
      'Authorization header must follow "Bearer <token>" format.',
      401
    );
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return sendError(
      res,
      'MISSING_AUTH_TOKEN',
      'Authentication token cannot be empty.',
      401
    );
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
    };
    return next();
  } catch (err: any) {
    const code = err instanceof AuthenticationError ? err.code : 'INVALID_TOKEN';
    const message = err.message || 'Invalid or expired authentication token.';
    return sendError(res, code, message, 401);
  }
}

/**
 * Authorization middleware that enforces resource ownership.
 * Ensures the authenticated user matches the userId specified in route params or body.
 * Returns 401 if unauthenticated and 403 if attempting to access another user's resources.
 */
export function requireOwnership(paramKey: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(
        res,
        'UNAUTHENTICATED',
        'Authentication required to perform this action.',
        401
      );
    }

    const targetUserId =
      req.params[paramKey] ||
      (req.body && req.body[paramKey]) ||
      (req.query && (req.query[paramKey] as string));

    if (targetUserId && req.user.id !== targetUserId) {
      return sendError(
        res,
        'FORBIDDEN_RESOURCE',
        "Access denied: You do not have permission to access or modify resources belonging to another user.",
        403
      );
    }

    return next();
  };
}
