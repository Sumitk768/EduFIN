import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validateBody } from '../middleware/validate.middleware';
import { CreateUserRequestSchema, UpdateUserRequestSchema } from '../models/user.model';
import { authenticateJwt, requireOwnership } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateJwt, (req, res, next) => userController.getAllUsers(req, res, next));
router.post('/', validateBody(CreateUserRequestSchema), (req, res, next) =>
  userController.createUser(req, res, next)
);
router.get('/:id', authenticateJwt, requireOwnership('id'), (req, res, next) =>
  userController.getUserById(req, res, next)
);
router.patch('/:id', authenticateJwt, requireOwnership('id'), validateBody(UpdateUserRequestSchema), (req, res, next) =>
  userController.updateUser(req, res, next)
);
router.delete('/:id', authenticateJwt, requireOwnership('id'), (req, res, next) =>
  userController.deleteUser(req, res, next)
);

export default router;
