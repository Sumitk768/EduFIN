import { UserProfile, CreateUserRequest, UpdateUserRequest } from '../models/user.model';
import { randomUUID } from 'crypto';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findAll(): Promise<UserProfile[]>;
  create(payload: CreateUserRequest): Promise<UserProfile>;
  update(id: string, payload: UpdateUserRequest): Promise<UserProfile | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserProfile> = new Map();

  constructor() {
    // Seed a default demo user profile for quick validation and testing
    const demoId = '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    this.users.set(demoId, {
      id: demoId,
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      preferredLanguage: 'hi',
      literacyLevel: 'beginner',
      monthlyIncomeCurrency: 'INR',
      estimatedMonthlyIncome: 45000,
      primaryFinancialGoal: 'Building emergency savings and learning compound growth',
      completedAssessment: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findAll(): Promise<UserProfile[]> {
    return Array.from(this.users.values());
  }

  async create(payload: CreateUserRequest): Promise<UserProfile> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      id,
      name: payload.name,
      email: payload.email,
      preferredLanguage: payload.preferredLanguage || 'en',
      literacyLevel: 'beginner',
      monthlyIncomeCurrency: payload.monthlyIncomeCurrency || 'USD',
      estimatedMonthlyIncome: payload.estimatedMonthlyIncome,
      primaryFinancialGoal: payload.primaryFinancialGoal,
      completedAssessment: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async update(id: string, payload: UpdateUserRequest): Promise<UserProfile | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: UserProfile = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

export const inMemoryUserRepository = new InMemoryUserRepository();
export const userRepository: IUserRepository = {
  findById: (id) => inMemoryUserRepository.findById(id),
  findByEmail: (email) => inMemoryUserRepository.findByEmail(email),
  findAll: () => inMemoryUserRepository.findAll(),
  create: (p) => inMemoryUserRepository.create(p),
  update: (id, p) => inMemoryUserRepository.update(id, p),
  delete: (id) => inMemoryUserRepository.delete(id),
};
