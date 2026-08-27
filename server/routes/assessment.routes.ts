import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';
import { validateBody } from '../middleware/validate.middleware';
import { AssessmentSubmissionSchema } from '../models/assessment.model';

const router = Router();

router.get('/questions', (req, res, next) => assessmentController.getQuestions(req, res, next));
router.post('/submit', validateBody(AssessmentSubmissionSchema), (req, res, next) =>
  assessmentController.submitAssessment(req, res, next)
);
router.get('/user/:userId/latest', (req, res, next) =>
  assessmentController.getLatestResult(req, res, next)
);

export default router;
