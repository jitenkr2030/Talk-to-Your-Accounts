import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { getConfig } from '../../config';

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  service?: string;
  correlationId?: string;
  tenantId?: string;
  provider?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  service?: string;
  correlationId?: string;
  tenantId?: string;
  provider?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class LoggerService {
  private logger: winston.Logger | null = null;
  private config: ReturnType<typeof getConfig>;
  private logDir: string;

  constructor() {
    this.config = getConfig();
    this.logDir = this.config.log.dir;
    this.initializeLogger();
  }

  private initializeLogger(): void {
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );

    this.logger = winston.createLogger({
      level: this.config.app.logLevel,
      format: customFormat,
      defaultMeta: {
        service: 'enterprise-integrations',
        version: '1.0.0',
      },
      transports: [
        // Error log
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: this.parseSize(this.config.log.maxSize),
          maxFiles: this.config.log.maxFiles,
        }),
        // Combined log
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          maxsize: this.parseSize(this.config.log.maxSize),
          maxFiles: this.config.log.maxFiles,
        }),
        // Provider-specific logs
        new winston.transports.File({
          filename: path.join(this.logDir, 'quickbooks.log'),
          level: 'info',
          maxsize: this.parseSize(this.config.log.maxSize),
          maxFiles: this.config.log.maxFiles,
        }),
        new winston.transports.File({
          filename: path.join(this.logDir, 'xero.log'),
          level: 'info',
          maxsize: this.parseSize(this.config.log.maxSize),
          maxFiles: this.config.log.maxFiles,
        }),
        new winston.transports.File({
          filename: path.join(this.logDir, 'zoho.log'),
          level: 'info',
          maxsize: this.parseSize(this.config.log.maxSize),
          maxFiles: this.config.log.maxFiles,
        }),
      ],
    });

    // Add console transport in development
    if (this.config.app.env === 'development') {
      this.logger.add(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    }
  }

  private parseSize(size: string): number {
    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };
    const match = size.match(/^(\d+)([bkmg])$/i);
    if (match) {
      return parseInt(match[1], 10) * units[match[2].toLowerCase()];
    }
    return 20 * 1024 * 1024; // Default 20MB
  }

  private createLogEntry(
    level: string,
    message: string,
    options: LoggerOptions,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: options.service,
      correlationId: options.correlationId,
      tenantId: options.tenantId,
      provider: options.provider,
      action: options.action,
      metadata: options.metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  info(message: string, options?: LoggerOptions): void {
    this.logger?.info(message, options);
  }

  error(message: string, error?: Error, options?: LoggerOptions): void {
    const entry = this.createLogEntry('error', message, options || {}, error);
    this.logger?.error(message, { ...options, error: entry.error });
  }

  warn(message: string, options?: LoggerOptions): void {
    this.logger?.warn(message, options);
  }

  debug(message: string, options?: LoggerOptions): void {
    this.logger?.debug(message, options);
  }

  verbose(message: string, options?: LoggerOptions): void {
    this.logger?.verbose(message, options);
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    options?: LoggerOptions
  ): void {
    this.info(`HTTP ${method} ${url} ${statusCode} ${duration}ms`, {
      ...options,
      action: 'api_request',
      metadata: {
        method,
        url,
        statusCode,
        duration,
        ...options?.metadata,
      },
    });
  }

  /**
   * Log OAuth event
   */
  logOAuthEvent(
    event: string,
    provider: string,
    success: boolean,
    options?: LoggerOptions
  ): void {
    this.info(`OAuth ${event} - ${provider} - ${success ? 'SUCCESS' : 'FAILED'}`, {
      ...options,
      provider,
      action: 'oauth_event',
      metadata: {
        event,
        provider,
        success,
        ...options?.metadata,
      },
    });
  }

  /**
   * Log webhook event
   */
  logWebhook(
    provider: string,
    eventType: string,
    deliveryId: string,
    success: boolean,
    options?: LoggerOptions
  ): void {
    this.info(`Webhook ${eventType} from ${provider} - ${deliveryId} - ${
      success ? 'PROCESSED' : 'FAILED'
    }`, {
      ...options,
      provider,
      action: 'webhook_event',
      metadata: {
        eventType,
        deliveryId,
        success,
        ...options?.metadata,
      },
    });
  }

  /**
   * Log circuit breaker state change
   */
  logCircuitBreaker(
    provider: string,
    previousState: string,
    currentState: string,
    options?: LoggerOptions
  ): void {
    this.warn(`Circuit Breaker ${provider}: ${previousState} -> ${currentState}`, {
      ...options,
      provider,
      action: 'circuit_breaker',
      metadata: {
        provider,
        previousState,
        currentState,
        ...options?.metadata,
      },
    });
  }

  /**
   * Log rate limit event
   */
  logRateLimit(
    provider: string,
    currentCount: number,
    limit: number,
    windowMs: number,
    options?: LoggerOptions
  ): void {
    this.warn(`Rate Limit ${provider}: ${currentCount}/${limit}`, {
      ...options,
      provider,
      action: 'rate_limit',
      metadata: {
        currentCount,
        limit,
        windowMs,
        ...options?.metadata,
      },
    });
  }

  /**
   * Create a child logger with preset context
   */
  child(options: LoggerOptions): LoggerService {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger?.child(options) || null;
    return childLogger;
  }

  /**
   * Flush logs (useful before process exit)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger?.on('finish', resolve);
      this.logger?.end();
    });
  }
}

// Singleton instance
let loggerInstance: LoggerService | null = null;

export function getLogger(): LoggerService {
  if (!loggerInstance) {
    loggerInstance = new LoggerService();
  }
  return loggerInstance;
}

export { LoggerService };
