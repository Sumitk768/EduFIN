import { Router } from 'express';
import { scamCheckerController } from '../controllers/scam-checker.controller';
import { validateBody } from '../middleware/validate.middleware';
import { CheckScamRequestSchema } from '../models/scam-checker.model';

const router = Router();

router.post('/analyze', validateBody(CheckScamRequestSchema), (req, res, next) =>
  scamCheckerController.analyzeMessage(req, res, next)
);

export default router;
