import { Request, Response, NextFunction } from 'express';
import { assistantService } from '../services/assistant.service';
import { sendSuccess } from '../utils/response.util';

export class AssistantController {
  async chatWithTutor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assistantService.askFinancialTutor(req.body);
      return sendSuccess(res, result, 'AI Financial Tutor response generated');
    } catch (err) {
      next(err);
    }
  }

  async explainTerm(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assistantService.explainTerm(req.body);
      return sendSuccess(res, result, 'Term explanation generated');
    } catch (err) {
      next(err);
    }
  }
}

export const assistantController = new AssistantController();
