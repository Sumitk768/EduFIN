import { Request, Response, NextFunction } from 'express';
import { scamCheckerService } from '../services/scam-checker.service';
import { sendSuccess } from '../utils/response.util';

export class ScamCheckerController {
  async analyzeMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scamCheckerService.analyzeMessage(req.body);
      return sendSuccess(res, result, 'Message analyzed for scam & fraud indicators');
    } catch (err) {
      next(err);
    }
  }
}

export const scamCheckerController = new ScamCheckerController();
