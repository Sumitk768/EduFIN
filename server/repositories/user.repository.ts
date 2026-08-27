import {
  UserProfile,
  CreateUserRequest,
  UpdateUserRequest,
  UserAuthRecord,
  CreateUserInternalRequest,
} from '../models/user.model';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findAuthByEmail(email: string): Promise<UserAuthRecord | null>;
  findAuthById(id: string): Promise<UserAuthRecord | null>;
  findAll(): Promise<UserProfile[]>;
  create(payload: CreateUserInternalRequest): Promise<UserProfile>;
  update(id: string, payload: UpdateUserRequest): Promise<UserProfile | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserAuthRecord> = new Map();

  constructor() {
    // Seed a default demo user profile with a hashed password for testing
    const demoId = '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    const demoPasswordHash = bcrypt.hashSync('Priya@EduFin2026', 8);
    this.users.set(demoId, {
      id: demoId,
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash: demoPasswordHash,
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

  private sanitize(record: UserAuthRecord): UserProfile {
    const { passwordHash, ...profile } = record;
    return profile;
  }

  async findById(id: string): Promise<UserProfile | null> {
    const record = this.users.get(id);
    return record ? this.sanitize(record) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const record = await this.findAuthByEmail(email);
    return record ? this.sanitize(record) : null;
  }

  async findAuthByEmail(email: string): Promise<UserAuthRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  async findAuthById(id: string): Promise<UserAuthRecord | null> {
    const record = this.users.get(id);
    return record ? { ...record } : null;
  }

  async findAll(): Promise<UserProfile[]> {
    return Array.from(this.users.values()).map((u) => this.sanitize(u));
  }

  async create(payload: CreateUserInternalRequest): Promise<UserProfile> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newUser: UserAuthRecord = {
      id,
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      passwordHash: payload.passwordHash ?? null,
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
    return this.sanitize(newUser);
  }

  async update(id: string, payload: UpdateUserRequest): Promise<UserProfile | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: UserAuthRecord = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return this.sanitize(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

export const inMemoryUserRepository = new InMemoryUserRepository();
export const userRepository: IUserRepository = {
  findById: (id) => inMemoryUserRepository.findById(id),
  findByEmail: (email) => inMemoryUserRepository.findByEmail(email),
  findAuthByEmail: (email) => inMemoryUserRepository.findAuthByEmail(email),
  findAuthById: (id) => inMemoryUserRepository.findAuthById(id),
  findAll: () => inMemoryUserRepository.findAll(),
  create: (p) => inMemoryUserRepository.create(p),
  update: (id, p) => inMemoryUserRepository.update(id, p),
  delete: (id) => inMemoryUserRepository.delete(id),
};

