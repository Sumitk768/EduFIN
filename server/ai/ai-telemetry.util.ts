import { logger } from '../utils/logger.util';
import { AIErrorCategory } from './ai.errors';

export interface AITelemetryEvent {
  operation: string;
  model: string;
  latencyMs: number;
  success: boolean;
  errorCategory?: AIErrorCategory;
  errorMessage?: string;
  retryCount?: number;
  promptLength?: number;
  responseLength?: number;
  fallbackUsed?: boolean;
}

/**
 * Sanitizes input text and objects to avoid logging sensitive data (API keys, passwords, bearer tokens).
 */
export function sanitizeLogData<T = any>(data: T): T {
  if (!data) return data;

  if (typeof data === 'string') {
    return data
      .replace(/(AIza[0-9A-Za-z-_]+)/g, '[REDACTED_API_KEY]')
      .replace(/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, '[REDACTED_JWT]')
      .replace(/("?password"?\s*:\s*)"[^"]+"/gi, '$1"[REDACTED_PASSWORD]"')
      .replace(/("?passwordHash"?\s*:\s*)"[^"]+"/gi, '$1"[REDACTED_HASH]"') as unknown as T;
  }

  if (typeof data === 'object') {
    try {
      const copy = JSON.parse(JSON.stringify(data));
      const redactKeys = ['password', 'passwordHash', 'token', 'jwt', 'apiKey', 'geminiApiKey', 'secret'];

      const walk = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
          if (redactKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            walk(obj[key]);
          } else if (typeof obj[key] === 'string') {
            obj[key] = sanitizeLogData(obj[key]);
          }
        }
      };

      walk(copy);
      return copy;
    } catch {
      return data;
    }
  }

  return data;
}

/**
 * Records AI infrastructure telemetry safely without exposing secrets.
 */
export function recordAITelemetry(event: AITelemetryEvent): void {
  const sanitized = sanitizeLogData(event);

  if (event.success) {
    logger.info(
      `[AI-Telemetry] ${sanitized.operation} completed in ${sanitized.latencyMs}ms | model=${sanitized.model} | retries=${sanitized.retryCount || 0} | fallback=${Boolean(sanitized.fallbackUsed)}`
    );
  } else {
    logger.warn(
      `[AI-Telemetry] ${sanitized.operation} FAILED in ${sanitized.latencyMs}ms | model=${sanitized.model} | category=${sanitized.errorCategory || 'UNKNOWN'} | retries=${sanitized.retryCount || 0} | fallback=${Boolean(sanitized.fallbackUsed)} | err=${sanitized.errorMessage}`
    );
  }
}
