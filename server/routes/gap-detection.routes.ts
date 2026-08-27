import { Router } from 'express';
import { gapDetectionController } from '../controllers/gap-detection.controller';
import { authenticateJwt, requireOwnership } from '../middleware/auth.middleware';

const router = Router();

router.get('/:userId', authenticateJwt, requireOwnership('userId'), (req, res, next) =>
  gapDetectionController.getGapsByUserId(req, res, next)
);
router.post('/:userId/evaluate', authenticateJwt, requireOwnership('userId'), (req, res, next) =>
  gapDetectionController.evaluateGaps(req, res, next)
);

export default router;
