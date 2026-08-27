import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess, sendError } from '../utils/response.util';

export class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
      return sendSuccess(res, users, 'Retrieved all user profiles');
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUser(id);
      if (!user) {
        return sendError(res, 'USER_NOT_FOUND', `User with ID ${id} was not found.`, 404);
      }
      return sendSuccess(res, user, 'User profile retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const newUser = await userService.createUser(req.body);
      return sendSuccess(res, newUser, 'User profile created successfully', 201);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        return sendError(res, 'USER_ALREADY_EXISTS', err.message, 409);
      }
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await userService.updateUser(id, req.body);
      if (!updated) {
        return sendError(res, 'USER_NOT_FOUND', `User with ID ${id} was not found.`, 404);
      }
      return sendSuccess(res, updated, 'User profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await userService.deleteUser(id);
      if (!deleted) {
        return sendError(res, 'USER_NOT_FOUND', `User with ID ${id} was not found.`, 404);
      }
      return sendSuccess(res, { deleted: true, id }, 'User profile deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
