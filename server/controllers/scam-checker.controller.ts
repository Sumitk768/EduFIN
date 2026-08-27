import { Request, Response, NextFunction } from 'express';
import { scamCheckerService } from '../services/scam-checker.service';
import { repositoryFactory } from '../repositories/factory';
import { sendSuccess, sendError } from '../utils/response.util';

export class ScamCheckerController {
  async analyzeMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || null;
      const result = await scamCheckerService.analyzeMessage(req.body, userId);
      return sendSuccess(res, result, 'Message analyzed for scam & fraud indicators');
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required to view scan history', 401);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const scamRepo = repositoryFactory.getScamAnalysisRepository();
      const history = await scamRepo.findByUserId(userId, limit);

      return sendSuccess(res, history, 'User scam analysis history retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getHistoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required to view scan details', 401);
      }

      const id = req.params.id;
      const scamRepo = repositoryFactory.getScamAnalysisRepository();
      const analysis = await scamRepo.findById(id);

      if (!analysis) {
        return sendError(res, 'NOT_FOUND', 'Scam analysis record not found', 404);
      }

      if (analysis.userId && analysis.userId !== userId) {
        return sendError(res, 'FORBIDDEN', 'Access denied to requested scan history record', 403);
      }

      return sendSuccess(res, analysis, 'Scam analysis record retrieved');
    } catch (err) {
      next(err);
    }
  }

  async deleteHistoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const id = req.params.id;
      const scamRepo = repositoryFactory.getScamAnalysisRepository();
      const deleted = await scamRepo.delete(id, userId);

      if (!deleted) {
        return sendError(res, 'NOT_FOUND', 'Scam analysis record not found or access denied', 404);
      }

      return sendSuccess(res, { deleted: true }, 'Scam analysis record deleted');
    } catch (err) {
      next(err);
    }
  }
}

export const scamCheckerController = new ScamCheckerController();
