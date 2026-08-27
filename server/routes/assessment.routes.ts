import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';
import { validateBody } from '../middleware/validate.middleware';
import { AssessmentSubmissionSchema } from '../models/assessment.model';
import { authenticateJwt, requireOwnership } from '../middleware/auth.middleware';

const router = Router();

router.get('/questions', (req, res, next) => assessmentController.getQuestions(req, res, next));
router.post(
  '/submit',
  authenticateJwt,
  validateBody(AssessmentSubmissionSchema),
  requireOwnership('userId'),
  (req, res, next) => assessmentController.submitAssessment(req, res, next)
);
router.get('/user/:userId/latest', authenticateJwt, requireOwnership('userId'), (req, res, next) =>
  assessmentController.getLatestResult(req, res, next)
);

export default router;
