import { Request, Response, NextFunction } from 'express';
import { questionGenService } from '../services/question-gen.service';
import { sendSuccess } from '../utils/response.util';

export class QuestionGenController {
  async generateQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const questions = await questionGenService.generateQuestions(req.body);
      return sendSuccess(res, questions, 'Financial quiz questions generated');
    } catch (err) {
      next(err);
    }
  }

  async validateAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await questionGenService.validateAnswer(req.body);
      return sendSuccess(res, result, 'Answer validated with explanation');
    } catch (err) {
      next(err);
    }
  }
}

export const questionGenController = new QuestionGenController();
