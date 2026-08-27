import { Request, Response, NextFunction } from 'express';
import { learningPathService } from '../services/learning-path.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class LearningPathController {
  async getLearningPath(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const path = await learningPathService.getPath(userId);
      return sendSuccess(res, path, 'Personalized learning path retrieved');
    } catch (err) {
      next(err);
    }
  }

  async generateLearningPath(req: Request, res: Response, next: NextFunction) {
    try {
      const path = await learningPathService.generateOrGetLearningPath(req.body);
      return sendSuccess(res, path, 'Personalized learning path generated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateStepStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, stepId } = req.params;
      const { status } = req.body;

      const updated = await learningPathService.updateStep(userId, stepId, status);
      if (!updated) {
        return sendError(
          res,
          'STEP_NOT_FOUND',
          `Step ${stepId} or learning path for user ${userId} was not found.`,
          404
        );
      }
      return sendSuccess(res, updated, 'Learning path step status updated');
    } catch (err) {
      next(err);
    }
  }
}

export const learningPathController = new LearningPathController();
