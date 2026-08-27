import { Router } from 'express';
import { scamCheckerController } from '../controllers/scam-checker.controller';
import { validateBody } from '../middleware/validate.middleware';
import { authenticateJwt, optionalAuthenticateJwt } from '../middleware/auth.middleware';
import { CheckScamRequestSchema } from '../models/scam-checker.model';

const router = Router();

// Primary Scam & Fraud Analysis Endpoint (Supports both anonymous and authenticated scans)
router.post('/analyze', optionalAuthenticateJwt, validateBody(CheckScamRequestSchema), (req, res, next) =>
  scamCheckerController.analyzeMessage(req, res, next)
);

// Authenticated User Scan History Endpoints (User-isolated)
router.get('/history', authenticateJwt, (req, res, next) =>
  scamCheckerController.getHistory(req, res, next)
);

router.get('/history/:id', authenticateJwt, (req, res, next) =>
  scamCheckerController.getHistoryById(req, res, next)
);

router.delete('/history/:id', authenticateJwt, (req, res, next) =>
  scamCheckerController.deleteHistoryById(req, res, next)
);

export default router;
