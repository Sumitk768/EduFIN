import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validateBody } from '../middleware/validate.middleware';
import { CreateUserRequestSchema, UpdateUserRequestSchema } from '../models/user.model';

const router = Router();

router.get('/', (req, res, next) => userController.getAllUsers(req, res, next));
router.post('/', validateBody(CreateUserRequestSchema), (req, res, next) =>
  userController.createUser(req, res, next)
);
router.get('/:id', (req, res, next) => userController.getUserById(req, res, next));
router.patch('/:id', validateBody(UpdateUserRequestSchema), (req, res, next) =>
  userController.updateUser(req, res, next)
);
router.delete('/:id', (req, res, next) => userController.deleteUser(req, res, next));

export default router;
