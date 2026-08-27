import { Request, Response, NextFunction } from 'express';
import { assessmentService } from '../services/assessment.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class AssessmentController {
  async getQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const questions = await assessmentService.getQuestions();
      // Remove correctOptionId and detailed explanation from client response to prevent cheating
      const sanitized = questions.map(({ correctOptionId, explanation, ...rest }) => rest);
      return sendSuccess(res, sanitized, 'Diagnostic assessment questions retrieved');
    } catch (err) {
      next(err);
    }
  }

  async submitAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assessmentService.submitAssessment(req.body);
      return sendSuccess(res, result, 'Assessment submitted and scored successfully');
    } catch (err) {
      next(err);
    }
  }

  async getLatestResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await assessmentService.getLatestResult(userId);
      if (!result) {
        return sendError(res, 'ASSESSMENT_NOT_FOUND', `No completed assessments found for user ${userId}.`, 404);
      }
      return sendSuccess(res, result, 'Latest assessment result retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const assessmentController = new AssessmentController();
