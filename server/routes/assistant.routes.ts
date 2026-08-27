import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { validateBody } from '../middleware/validate.middleware';
import { AssistantQueryRequestSchema, ExplainTermRequestSchema } from '../models/assistant.model';

const router = Router();

router.post('/chat', validateBody(AssistantQueryRequestSchema), (req, res, next) =>
  assistantController.chatWithTutor(req, res, next)
);
router.post('/explain-term', validateBody(ExplainTermRequestSchema), (req, res, next) =>
  assistantController.explainTerm(req, res, next)
);

export default router;
