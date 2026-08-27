import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';
import { logger } from '../utils/logger.util';

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
}

export function isDatabaseConfigured(): boolean {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return true;
  }
  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME) {
    return true;
  }
  return false;
}

export function createPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
  }

  return {
    host: process.env.SQL_HOST || 'localhost',
    port: parseInt(process.env.SQL_PORT || '5432', 10),
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || 'postgres',
    database: process.env.SQL_DB_NAME || 'edufin',
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };
}

export function getOrCreatePool(customConfig?: PoolConfig): Pool {
  if (customConfig) {
    const pool = new Pool(customConfig);
    pool.on('error', (err) => {
      logger.error('Unexpected error on Postgres pool client:', err.message);
    });
    return pool;
  }

  if (!global._postgresPool) {
    const poolConfig = createPoolConfig();
    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      logger.error('Unexpected error on idle Postgres pool client:', err.message);
    });
  }

  return global._postgresPool;
}

export function getDatabaseClient(customPool?: Pool): NodePgDatabase<typeof schema> {
  if (customPool) {
    return drizzle(customPool, { schema });
  }

  if (!global._drizzleDb) {
    const pool = getOrCreatePool();
    global._drizzleDb = drizzle(pool, { schema });
  }

  return global._drizzleDb;
}

export const pool = getOrCreatePool();
export const db = getDatabaseClient();

export async function checkDatabaseConnection(customDbPool?: Pool): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const p = customDbPool || pool;
  const startTime = Date.now();
  try {
    const res = await p.query('SELECT 1 as alive;');
    const latencyMs = Date.now() - startTime;
    if (res.rows && res.rows.length > 0) {
      return { connected: true, latencyMs };
    }
    return { connected: false, error: 'No rows returned from alive query' };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Database connection failed',
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (global._postgresPool) {
    try {
      await global._postgresPool.end();
    } catch (e) {
      // ignore
    }
    global._postgresPool = undefined;
    global._drizzleDb = undefined;
  }
}
