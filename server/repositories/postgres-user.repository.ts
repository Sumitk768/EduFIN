import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'crypto';
import { IUserRepository } from './user.repository';
import { UserProfile, CreateUserRequest, UpdateUserRequest } from '../models/user.model';
import { db as defaultDb } from '../db/index';
import * as schema from '../db/schema';
import { logger } from '../utils/logger.util';

export class PostgresUserRepository implements IUserRepository {
  constructor(private db: NodePgDatabase<typeof schema> = defaultDb) {}

  async findById(id: string): Promise<UserProfile | null> {
    try {
      const rows = await this.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapToDomain(rows[0]);
    } catch (err: any) {
      logger.error(`PostgresUserRepository.findById error for id ${id}:`, err.message);
      throw new Error(`Failed to retrieve user by ID: ${err.message}`, { cause: err });
    }
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const rows = await this.db
        .select()
        .from(schema.users)
        .where(eq(sql`lower(${schema.users.email})`, normalizedEmail))
        .limit(1);

      if (rows.length === 0) return null;
      return this.mapToDomain(rows[0]);
    } catch (err: any) {
      logger.error(`PostgresUserRepository.findByEmail error for email ${email}:`, err.message);
      throw new Error(`Failed to retrieve user by email: ${err.message}`, { cause: err });
    }
  }

  async findAll(): Promise<UserProfile[]> {
    try {
      const rows = await this.db.select().from(schema.users);
      return rows.map((r) => this.mapToDomain(r));
    } catch (err: any) {
      logger.error('PostgresUserRepository.findAll error:', err.message);
      throw new Error(`Failed to list users: ${err.message}`, { cause: err });
    }
  }

  async create(payload: CreateUserRequest): Promise<UserProfile> {
    try {
      const id = randomUUID();
      const now = new Date();
      const rows = await this.db
        .insert(schema.users)
        .values({
          id,
          name: payload.name,
          email: payload.email.trim().toLowerCase(),
          preferredLanguage: payload.preferredLanguage || 'en',
          literacyLevel: 'beginner',
          monthlyIncomeCurrency: payload.monthlyIncomeCurrency || 'USD',
          estimatedMonthlyIncome: payload.estimatedMonthlyIncome ?? null,
          primaryFinancialGoal: payload.primaryFinancialGoal ?? null,
          completedAssessment: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return this.mapToDomain(rows[0]);
    } catch (err: any) {
      logger.error('PostgresUserRepository.create error:', err.message);
      throw new Error(`Failed to create user: ${err.message}`, { cause: err });
    }
  }

  async update(id: string, payload: UpdateUserRequest): Promise<UserProfile | null> {
    try {
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.preferredLanguage !== undefined) updateData.preferredLanguage = payload.preferredLanguage;
      if (payload.literacyLevel !== undefined) updateData.literacyLevel = payload.literacyLevel;
      if (payload.monthlyIncomeCurrency !== undefined) updateData.monthlyIncomeCurrency = payload.monthlyIncomeCurrency;
      if (payload.estimatedMonthlyIncome !== undefined) updateData.estimatedMonthlyIncome = payload.estimatedMonthlyIncome;
      if (payload.primaryFinancialGoal !== undefined) updateData.primaryFinancialGoal = payload.primaryFinancialGoal;

      const rows = await this.db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, id))
        .returning();

      if (rows.length === 0) return null;
      return this.mapToDomain(rows[0]);
    } catch (err: any) {
      logger.error(`PostgresUserRepository.update error for id ${id}:`, err.message);
      throw new Error(`Failed to update user: ${err.message}`, { cause: err });
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const rows = await this.db
        .delete(schema.users)
        .where(eq(schema.users.id, id))
        .returning();

      return rows.length > 0;
    } catch (err: any) {
      logger.error(`PostgresUserRepository.delete error for id ${id}:`, err.message);
      throw new Error(`Failed to delete user: ${err.message}`, { cause: err });
    }
  }

  private mapToDomain(row: typeof schema.users.$inferSelect): UserProfile {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      preferredLanguage: row.preferredLanguage as any,
      literacyLevel: row.literacyLevel as any,
      monthlyIncomeCurrency: row.monthlyIncomeCurrency,
      estimatedMonthlyIncome: row.estimatedMonthlyIncome ?? undefined,
      primaryFinancialGoal: row.primaryFinancialGoal ?? undefined,
      completedAssessment: row.completedAssessment,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date(row.updatedAt).toISOString(),
    };
  }
}

