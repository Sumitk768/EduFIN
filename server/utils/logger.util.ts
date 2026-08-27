type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    return `[${timestamp}] [EduFIN-${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, meta?: any) {
    console.error(this.format('error', message, meta));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();
