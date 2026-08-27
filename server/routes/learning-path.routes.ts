import { Router } from 'express';
import { learningPathController } from '../controllers/learning-path.controller';
import { validateBody } from '../middleware/validate.middleware';
import { GenerateLearningPathRequestSchema } from '../models/learning-path.model';
import { z } from 'zod';

const UpdateStepStatusSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

const router = Router();

router.get('/:userId', (req, res, next) =>
  learningPathController.getLearningPath(req, res, next)
);
router.post('/generate', validateBody(GenerateLearningPathRequestSchema), (req, res, next) =>
  learningPathController.generateLearningPath(req, res, next)
);
router.patch('/:userId/steps/:stepId', validateBody(UpdateStepStatusSchema), (req, res, next) =>
  learningPathController.updateStepStatus(req, res, next)
);

export default router;
