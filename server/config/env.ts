import dotenv from 'dotenv';
dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string | undefined;
  GEMINI_API_KEY: string | undefined;
  APP_URL: string;
  API_PREFIX: string;
  APP_VERSION: string;
  APP_NAME: string;
}

export const config: EnvironmentConfig = {
  PORT: 3000, // Hardcoded for Google AI Studio ingress
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  API_PREFIX: '/api/v1',
  APP_VERSION: '1.0.0-backend-alpha',
  APP_NAME: 'EduFIN Backend Services',
};
