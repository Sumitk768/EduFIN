import { Request, Response, NextFunction } from 'express';
import { gapDetectionService } from '../services/gap-detection.service';
import { sendSuccess } from '../utils/response.util';

export class GapDetectionController {
  async getGapsByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const profile = await gapDetectionService.getLatestProfile(userId);
      return sendSuccess(res, profile, 'User knowledge gap profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async evaluateGaps(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const profile = await gapDetectionService.evaluateUserGaps(userId);
      return sendSuccess(res, profile, 'Knowledge gaps evaluated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const gapDetectionController = new GapDetectionController();
