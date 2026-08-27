import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { RegisterRequestSchema, LoginRequestSchema } from '../models/auth.model';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateBody(RegisterRequestSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', validateBody(LoginRequestSchema), (req, res, next) =>
  authController.login(req, res, next)
);

// Protected Identity Endpoint
router.get('/me', authenticateJwt, (req, res, next) =>
  authController.getCurrentUser(req, res, next)
);

export default router;
