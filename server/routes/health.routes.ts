import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/version', (req, res) => healthController.getVersion(req, res));
router.get('/docs', (req, res) => healthController.getApiDirectory(req, res));

export default router;
