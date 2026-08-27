import { Router } from 'express';
import { gapDetectionController } from '../controllers/gap-detection.controller';

const router = Router();

router.get('/:userId', (req, res, next) =>
  gapDetectionController.getGapsByUserId(req, res, next)
);
router.post('/:userId/evaluate', (req, res, next) =>
  gapDetectionController.evaluateGaps(req, res, next)
);

export default router;
