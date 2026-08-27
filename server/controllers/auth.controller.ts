import { Request, Response, NextFunction } from 'express';
import { authService, AuthenticationError } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        return sendError(res, err.code, err.message, err.statusCode);
      }
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, 'User authenticated successfully', 200);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        return sendError(res, err.code, err.message, err.statusCode);
      }
      next(err);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'UNAUTHENTICATED', 'Authentication required.', 401);
      }

      const user = await authService.getProfile(req.user.id);
      if (!user) {
        return sendError(res, 'USER_NOT_FOUND', 'User profile not found.', 404);
      }

      return sendSuccess(res, user, 'Current authenticated user profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
