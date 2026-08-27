import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  RecordLessonCompletionSchema,
  RecordQuizScoreSchema,
} from '../models/progress.model';

const router = Router();

router.get('/:userId', (req, res, next) =>
  progressController.getUserProgress(req, res, next)
);
router.post('/lesson-completed', validateBody(RecordLessonCompletionSchema), (req, res, next) =>
  progressController.recordLessonCompletion(req, res, next)
);
router.post('/quiz-score', validateBody(RecordQuizScoreSchema), (req, res, next) =>
  progressController.recordQuizScore(req, res, next)
);

export default router;
