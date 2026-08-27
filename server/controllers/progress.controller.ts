import { Request, Response, NextFunction } from 'express';
import { progressService } from '../services/progress.service';
import { sendSuccess } from '../utils/response.util';

export class ProgressController {
  async getUserProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const progress = await progressService.getUserProgress(userId);
      return sendSuccess(res, progress, 'User progress retrieved');
    } catch (err) {
      next(err);
    }
  }

  async recordLessonCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await progressService.recordLessonCompletion(req.body);
      return sendSuccess(res, updated, 'Lesson completion recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  async recordQuizScore(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await progressService.recordQuizScore(req.body);
      return sendSuccess(res, updated, 'Quiz score recorded successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const progressController = new ProgressController();
