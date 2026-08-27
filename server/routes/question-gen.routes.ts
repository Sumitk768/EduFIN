import { Router } from 'express';
import { questionGenController } from '../controllers/question-gen.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  GenerateQuestionsRequestSchema,
  ValidateGeneratedAnswerRequestSchema,
} from '../models/question-gen.model';

const router = Router();

router.post('/generate', validateBody(GenerateQuestionsRequestSchema), (req, res, next) =>
  questionGenController.generateQuestions(req, res, next)
);
router.post('/validate', validateBody(ValidateGeneratedAnswerRequestSchema), (req, res, next) =>
  questionGenController.validateAnswer(req, res, next)
);

export default router;
