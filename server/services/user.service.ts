import { userRepository, IUserRepository } from '../repositories/user.repository';
import { UserProfile, CreateUserRequest, UpdateUserRequest } from '../models/user.model';
import { logger } from '../utils/logger.util';

export class UserService {
  constructor(private repo: IUserRepository = userRepository) {}

  async getUser(id: string): Promise<UserProfile | null> {
    return this.repo.findById(id);
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.repo.findAll();
  }

  async createUser(payload: CreateUserRequest): Promise<UserProfile> {
    const existing = await this.repo.findByEmail(payload.email);
    if (existing) {
      throw new Error(`A user profile with email ${payload.email} already exists.`);
    }
    logger.info(`Creating new user profile for ${payload.name} (${payload.email})`);
    return this.repo.create(payload);
  }

  async updateUser(id: string, payload: UpdateUserRequest): Promise<UserProfile | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    logger.info(`Updating user profile for ID ${id}`);
    return this.repo.update(id, payload);
  }

  async deleteUser(id: string): Promise<boolean> {
    logger.info(`Deleting user profile ID ${id}`);
    return this.repo.delete(id);
  }
}

export const userService = new UserService();
