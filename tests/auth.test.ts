import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import * as schema from '../server/db/schema';
import { seedDatabase } from '../server/db/seed';
import { InMemoryUserRepository } from '../server/repositories/user.repository';
import { PostgresUserRepository } from '../server/repositories/postgres-user.repository';
import { AuthService, AuthenticationError } from '../server/services/auth.service';
import { config } from '../server/config/env';
import { authenticateJwt, requireOwnership } from '../server/middleware/auth.middleware';

describe('EduFIN Phase 3: Authentication & Access Control Tests', () => {
  let memDb: any;
  let pool: any;
  let testDb: any;
  let postgresUserRepo: PostgresUserRepository;
  let inMemoryUserRepo: InMemoryUserRepository;
  let authServicePostgres: AuthService;
  let authServiceMemory: AuthService;

  before(async () => {
    // 1. Initialize in-memory PostgreSQL instance for dialect testing
    memDb = newDb();
    memDb.public.registerFunction({
      name: 'current_database',
      args: [],
      returns: memDb.public.getType('text'),
      implementation: () => 'edufin_auth_test',
    });
    memDb.public.registerFunction({
      name: 'version',
      args: [],
      returns: memDb.public.getType('text'),
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    });

    const pgAdapter = memDb.adapters.createPg();
    pool = new pgAdapter.Pool();

    const originalQuery = pool.query.bind(pool);
    pool.query = async function (text: any, params: any, callback: any) {
      if (typeof text === 'object' && text !== null) {
        const isArrayMode = text.rowMode === 'array';
        const { types, rowMode, ...rest } = text;
        const res = await originalQuery(rest, params);
        if (isArrayMode && res && Array.isArray(res.rows)) {
          res.rows = res.rows.map((row: any) => Object.values(row));
        }
        if (callback) callback(null, res);
        return res;
      }
      return originalQuery(text, params, callback);
    } as any;

    testDb = drizzle(pool, { schema });

    // Initialize DDL schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        preferred_language TEXT NOT NULL DEFAULT 'en',
        literacy_level TEXT NOT NULL DEFAULT 'beginner',
        monthly_income_currency TEXT NOT NULL DEFAULT 'USD',
        estimated_monthly_income DOUBLE PRECISION,
        primary_financial_goal TEXT,
        completed_assessment BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
      CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);
    `);

    // Seed demo user in Postgres testDb
    const demoPasswordHash = bcrypt.hashSync('Priya@EduFin2026', 8);
    await testDb.insert(schema.users).values({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash: demoPasswordHash,
      preferredLanguage: 'hi',
      literacyLevel: 'beginner',
      monthlyIncomeCurrency: 'INR',
      estimatedMonthlyIncome: 45000,
      primaryFinancialGoal: 'Building emergency savings and learning compound growth',
      completedAssessment: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    postgresUserRepo = new PostgresUserRepository(testDb);
    inMemoryUserRepo = new InMemoryUserRepository();

    authServicePostgres = new AuthService(postgresUserRepo);
    authServiceMemory = new AuthService(inMemoryUserRepo);
  });

  describe('1. Password Hashing & Security', () => {
    it('should securely hash passwords with bcrypt work factor', async () => {
      const plainPassword = 'SuperSecretPassword123!';
      const hash = await authServiceMemory.hashPassword(plainPassword);

      assert.notEqual(hash, plainPassword, 'Hash must not match plain text password');
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash should follow bcrypt format');

      const isMatch = await authServiceMemory.comparePassword(plainPassword, hash);
      assert.equal(isMatch, true, 'bcrypt compare should verify valid password');

      const isMismatch = await authServiceMemory.comparePassword('WrongPassword', hash);
      assert.equal(isMismatch, false, 'bcrypt compare should reject invalid password');
    });

    it('should never expose passwordHash in public UserProfile models', async () => {
      const reg = await authServiceMemory.register({
        name: 'Safe User',
        email: 'safe.user@example.com',
        password: 'Password123!',
      });

      assert.equal(reg.user.name, 'Safe User');
      assert.equal(reg.user.email, 'safe.user@example.com');
      assert.equal((reg.user as any).passwordHash, undefined, 'passwordHash must not exist on public UserProfile');
      assert.equal((reg.user as any).password, undefined, 'plain password must not exist on public UserProfile');
    });
  });

  describe('2. User Registration Flow (In-Memory & Postgres)', () => {
    it('should register a new user and return JWT in In-Memory mode', async () => {
      const response = await authServiceMemory.register({
        name: 'Aarav Patel',
        email: 'aarav.patel@example.com',
        password: 'SecurePassword123!',
        preferredLanguage: 'hi',
        monthlyIncomeCurrency: 'INR',
        estimatedMonthlyIncome: 60000,
        primaryFinancialGoal: 'Retirement planning',
      });

      assert.ok(response.user.id, 'User ID should be generated');
      assert.equal(response.user.email, 'aarav.patel@example.com');
      assert.ok(response.token, 'Token should be returned');
      assert.equal(response.expiresIn, config.JWT_EXPIRES_IN);

      // Verify user was persisted internally with password hash
      const authRecord = await inMemoryUserRepo.findAuthByEmail('aarav.patel@example.com');
      assert.ok(authRecord?.passwordHash, 'Internal record must have password hash');
      assert.notEqual(authRecord?.passwordHash, 'SecurePassword123!');
    });

    it('should register a new user and return JWT in Postgres mode', async () => {
      const response = await authServicePostgres.register({
        name: 'Diya Sen',
        email: 'diya.sen@example.com',
        password: 'DiyaSecurePassword2026!',
        preferredLanguage: 'en',
        monthlyIncomeCurrency: 'USD',
        estimatedMonthlyIncome: 5000,
      });

      assert.ok(response.user.id, 'User ID should be generated');
      assert.equal(response.user.email, 'diya.sen@example.com');
      assert.ok(response.token, 'Token should be returned');

      // Verify database record has password_hash and no plain text
      const authRecord = await postgresUserRepo.findAuthByEmail('diya.sen@example.com');
      assert.ok(authRecord?.passwordHash, 'Postgres record must contain password hash');
      assert.notEqual(authRecord?.passwordHash, 'DiyaSecurePassword2026!');
    });

    it('should reject duplicate email registration with 409 status', async () => {
      await assert.rejects(
        async () => {
          await authServiceMemory.register({
            name: 'Duplicate User',
            email: 'aarav.patel@example.com',
            password: 'AnotherPassword123!',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'USER_ALREADY_EXISTS');
          assert.equal(err.statusCode, 409);
          return true;
        }
      );
    });
  });

  describe('3. User Login Flow', () => {
    it('should authenticate valid credentials and return JWT', async () => {
      const response = await authServiceMemory.login({
        email: 'aarav.patel@example.com',
        password: 'SecurePassword123!',
      });

      assert.equal(response.user.email, 'aarav.patel@example.com');
      assert.ok(response.token);

      // Verify token contains user identity
      const decoded = jwt.verify(response.token, config.JWT_SECRET) as any;
      assert.equal(decoded.id, response.user.id);
      assert.equal(decoded.email, 'aarav.patel@example.com');
    });

    it('should authenticate seeded demo user with valid credentials', async () => {
      const response = await authServiceMemory.login({
        email: 'priya.sharma@example.com',
        password: 'Priya@EduFin2026',
      });

      assert.equal(response.user.name, 'Priya Sharma');
      assert.ok(response.token);
    });

    it('should reject login with invalid password', async () => {
      await assert.rejects(
        async () => {
          await authServiceMemory.login({
            email: 'aarav.patel@example.com',
            password: 'WrongPassword!',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_CREDENTIALS');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it('should reject login with nonexistent user email', async () => {
      await assert.rejects(
        async () => {
          await authServiceMemory.login({
            email: 'nonexistent.user@example.com',
            password: 'AnyPassword123!',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_CREDENTIALS');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });
  });

  describe('4. JWT Token Generation & Verification', () => {
    it('should generate valid JWT tokens and decode user identity', () => {
      const token = authServiceMemory.generateToken({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'token.test@example.com',
      });

      const payload = authServiceMemory.verifyToken(token);
      assert.equal(payload.id, '11111111-1111-1111-1111-111111111111');
      assert.equal(payload.email, 'token.test@example.com');
    });

    it('should reject invalid JWT tokens', () => {
      assert.throws(
        () => {
          authServiceMemory.verifyToken('invalid.token.signature');
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_TOKEN');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it('should reject expired JWT tokens', () => {
      // Create an already expired token
      const expiredToken = jwt.sign(
        { id: '11111111-1111-1111-1111-111111111111', email: 'expired@example.com' },
        config.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      assert.throws(
        () => {
          authServiceMemory.verifyToken(expiredToken);
        },
        (err: any) => {
          assert.equal(err.code, 'TOKEN_EXPIRED');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });
  });

  describe('5. Authentication Middleware (authenticateJwt)', () => {
    it('should reject request when Authorization header is missing (401)', () => {
      let statusCalled: number | null = null;
      let jsonPayload: any = null;

      const req: any = { headers: {} };
      const res: any = {
        status: (code: number) => {
          statusCalled = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
              return res;
            },
          };
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticateJwt(req, res, next);
      assert.equal(nextCalled, false, 'next() should not be called');
      assert.equal(statusCalled, 401);
      assert.equal(jsonPayload.error.code, 'MISSING_AUTH_TOKEN');
    });

    it('should reject request when Authorization header is malformed (401)', () => {
      let statusCalled: number | null = null;
      let jsonPayload: any = null;

      const req: any = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res: any = {
        status: (code: number) => {
          statusCalled = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
              return res;
            },
          };
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticateJwt(req, res, next);
      assert.equal(nextCalled, false);
      assert.equal(statusCalled, 401);
      assert.equal(jsonPayload.error.code, 'MALFORMED_AUTH_HEADER');
    });

    it('should attach user identity to req.user on valid token and call next()', () => {
      const token = authServiceMemory.generateToken({
        id: '22222222-2222-2222-2222-222222222222',
        email: 'authenticated.user@example.com',
      });

      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res: any = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticateJwt(req, res, next);
      assert.equal(nextCalled, true);
      assert.deepEqual(req.user, {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'authenticated.user@example.com',
      });
    });
  });

  describe('6. Authorization & Ownership Checks (requireOwnership)', () => {
    it('should allow user to access their own resource in route params', () => {
      const req: any = {
        user: { id: 'user-123', email: 'user123@example.com' },
        params: { userId: 'user-123' },
      };
      const res: any = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireOwnership('userId')(req, res, next);
      assert.equal(nextCalled, true, 'User should access own resource');
    });

    it('should deny user attempting to access another user resource with 403 Forbidden', () => {
      let statusCalled: number | null = null;
      let jsonPayload: any = null;

      const req: any = {
        user: { id: 'user-123', email: 'user123@example.com' },
        params: { userId: 'user-456' },
      };
      const res: any = {
        status: (code: number) => {
          statusCalled = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
              return res;
            },
          };
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireOwnership('userId')(req, res, next);
      assert.equal(nextCalled, false, 'next() should not be called for mismatched user');
      assert.equal(statusCalled, 403, 'Should return 403 Forbidden');
      assert.equal(jsonPayload.error.code, 'FORBIDDEN_RESOURCE');
    });

    it('should enforce ownership in request body', () => {
      let statusCalled: number | null = null;
      const req: any = {
        user: { id: 'user-123', email: 'user123@example.com' },
        params: {},
        body: { userId: 'user-attacker' },
      };
      const res: any = {
        status: (code: number) => {
          statusCalled = code;
          return { json: () => res };
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      requireOwnership('userId')(req, res, next);
      assert.equal(nextCalled, false);
      assert.equal(statusCalled, 403);
    });
  });

  describe('7. Zod Schema Input Validation for Authentication', () => {
    it('should reject registration payload with missing or invalid email', async () => {
      const { RegisterRequestSchema } = await import('../server/models/auth.model');
      const result = RegisterRequestSchema.safeParse({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!',
      });
      assert.equal(result.success, false, 'Should fail validation on invalid email');
    });

    it('should reject registration payload with password shorter than 6 characters', async () => {
      const { RegisterRequestSchema } = await import('../server/models/auth.model');
      const result = RegisterRequestSchema.safeParse({
        name: 'Short Password User',
        email: 'user@example.com',
        password: '123',
      });
      assert.equal(result.success, false, 'Should fail validation on short password');
    });

    it('should reject login payload with missing password', async () => {
      const { LoginRequestSchema } = await import('../server/models/auth.model');
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      assert.equal(result.success, false, 'Should fail validation on empty password');
    });
  });

  describe('8. Auth Controller End-to-End Handlers', () => {
    it('should register via AuthController and return 201 with token', async () => {
      const { authController } = await import('../server/controllers/auth.controller');
      let statusCode = 200;
      let responsePayload: any = null;

      const req: any = {
        body: {
          name: 'Controller Test User',
          email: 'controller.test@example.com',
          password: 'ControllerPassword123!',
        },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responsePayload = data;
              return res;
            },
          };
        },
      };

      await authController.register(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 201);
      assert.equal(responsePayload.success, true);
      assert.ok(responsePayload.data.token);
      assert.equal(responsePayload.data.user.email, 'controller.test@example.com');
      assert.equal(responsePayload.data.user.passwordHash, undefined);
      assert.equal(responsePayload.data.user.password, undefined);
    });

    it('should login via AuthController and return 200 with token', async () => {
      const { authController } = await import('../server/controllers/auth.controller');
      let statusCode = 0;
      let responsePayload: any = null;

      const req: any = {
        body: {
          email: 'controller.test@example.com',
          password: 'ControllerPassword123!',
        },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responsePayload = data;
              return res;
            },
          };
        },
      };

      await authController.login(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 200);
      assert.equal(responsePayload.success, true);
      assert.ok(responsePayload.data.token);
      assert.equal(responsePayload.data.user.email, 'controller.test@example.com');
    });

    it('should return current authenticated user profile via AuthController.getCurrentUser', async () => {
      const { authController } = await import('../server/controllers/auth.controller');
      const { repositoryFactory } = await import('../server/repositories');
      const user = await repositoryFactory.getUserRepository().findByEmail('controller.test@example.com');
      assert.ok(user);

      let statusCode = 200;
      let responsePayload: any = null;

      const req: any = {
        user: { id: user.id, email: user.email },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responsePayload = data;
              return res;
            },
          };
        },
      };

      await authController.getCurrentUser(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(statusCode, 200);
      assert.equal(responsePayload.success, true);
      assert.equal(responsePayload.data.email, 'controller.test@example.com');
      assert.equal(responsePayload.data.passwordHash, undefined);
    });
  });
});

