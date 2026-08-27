import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository, repositoryFactory } from '../repositories';
import { config } from '../config/env';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  JwtPayload,
} from '../models/auth.model';
import { UserProfile } from '../models/user.model';
import { logger } from '../utils/logger.util';

export class AuthenticationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = 'AUTHENTICATION_FAILED', statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthService {
  private saltRounds = 10;

  constructor(
    private userRepo: IUserRepository = repositoryFactory.getUserRepository()
  ) {}

  /**
   * Hashes plain text password using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Securely compares plain text password against stored hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Issues signed JWT for authenticated user.
   */
  generateToken(payload: { id: string; email: string }): string {
    const tokenPayload: JwtPayload = {
      id: payload.id,
      email: payload.email,
    };
    return jwt.sign(tokenPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
    });
  }

  /**
   * Verifies and decodes JWT.
   */
  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Authentication token has expired. Please log in again.', 'TOKEN_EXPIRED', 401);
      }
      throw new AuthenticationError('Invalid authentication token.', 'INVALID_TOKEN', 401);
    }
  }

  /**
   * Registers a new user with securely hashed password and generates initial JWT.
   */
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    // 1. Check if email already registered
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new AuthenticationError(
        `An account with email ${payload.email} already exists.`,
        'USER_ALREADY_EXISTS',
        409
      );
    }

    // 2. Hash password securely
    const passwordHash = await this.hashPassword(payload.password);

    // 3. Create user record
    const user = await this.userRepo.create({
      name: payload.name,
      email: normalizedEmail,
      passwordHash,
      preferredLanguage: payload.preferredLanguage || 'en',
      monthlyIncomeCurrency: payload.monthlyIncomeCurrency || 'USD',
      estimatedMonthlyIncome: payload.estimatedMonthlyIncome,
      primaryFinancialGoal: payload.primaryFinancialGoal,
    });

    logger.info(`User registered successfully: ${user.id} (${normalizedEmail})`);

    // 4. Generate JWT
    const token = this.generateToken({ id: user.id, email: user.email });

    return {
      user,
      token,
      expiresIn: config.JWT_EXPIRES_IN,
    };
  }

  /**
   * Authenticates user credentials and returns JWT with safe UserProfile.
   */
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    // 1. Find user with auth record
    const userAuth = await this.userRepo.findAuthByEmail(normalizedEmail);
    if (!userAuth || !userAuth.passwordHash) {
      // Use generic error message to prevent user enumeration
      throw new AuthenticationError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    // 2. Compare password hash
    const isMatch = await this.comparePassword(payload.password, userAuth.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    // 3. Build sanitized UserProfile (explicitly excluding passwordHash)
    const safeUser: UserProfile = {
      id: userAuth.id,
      name: userAuth.name,
      email: userAuth.email,
      preferredLanguage: userAuth.preferredLanguage,
      literacyLevel: userAuth.literacyLevel,
      monthlyIncomeCurrency: userAuth.monthlyIncomeCurrency,
      estimatedMonthlyIncome: userAuth.estimatedMonthlyIncome,
      primaryFinancialGoal: userAuth.primaryFinancialGoal,
      completedAssessment: userAuth.completedAssessment,
      createdAt: userAuth.createdAt,
      updatedAt: userAuth.updatedAt,
    };

    // 4. Generate JWT
    const token = this.generateToken({ id: safeUser.id, email: safeUser.email });

    logger.info(`User logged in successfully: ${safeUser.id} (${normalizedEmail})`);

    return {
      user: safeUser,
      token,
      expiresIn: config.JWT_EXPIRES_IN,
    };
  }

  /**
   * Fetches safe profile by user ID.
   */
  async getProfile(id: string): Promise<UserProfile | null> {
    return this.userRepo.findById(id);
  }
}

export const authService = new AuthService();
