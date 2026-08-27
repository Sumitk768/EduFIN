import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  RecordLessonCompletionSchema,
  RecordQuizScoreSchema,
} from '../models/progress.model';
import { authenticateJwt, requireOwnership } from '../middleware/auth.middleware';

const router = Router();

router.get('/:userId', authenticateJwt, requireOwnership('userId'), (req, res, next) =>
  progressController.getUserProgress(req, res, next)
);
router.post(
  '/lesson-completed',
  authenticateJwt,
  validateBody(RecordLessonCompletionSchema),
  requireOwnership('userId'),
  (req, res, next) => progressController.recordLessonCompletion(req, res, next)
);
router.post(
  '/quiz-score',
  authenticateJwt,
  validateBody(RecordQuizScoreSchema),
  requireOwnership('userId'),
  (req, res, next) => progressController.recordQuizScore(req, res, next)
);

export default router;
