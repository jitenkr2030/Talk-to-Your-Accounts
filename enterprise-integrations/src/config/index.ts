import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  poolMin: number;
  poolMax: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
}

export interface EncryptionConfig {
  key: string;
  ivLength: number;
}

export interface JwtConfig {
  secret: string;
  expiration: string;
  refreshExpiration: string;
}

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment?: string;
  dataCenter?: string;
}

export interface QuickBooksConfig extends ProviderCredentials {
  environment: 'sandbox' | 'production';
}

export interface ZohoConfig extends ProviderCredentials {
  dataCenter: string;
}

export interface WebhookConfig {
  secret: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThreshold: number;
  resetTimeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  multiplier: number;
  maxDelay: number;
  jitterRange: number;
}

export interface QueueConfig {
  namePrefix: string;
  priorities: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface LogConfig {
  maxFiles: number;
  maxSize: string;
  dir: string;
}

export interface SentryConfig {
  dsn: string;
}

export interface EnvironmentVariables {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  encryption: EncryptionConfig;
  jwt: JwtConfig;
  quickbooks: QuickBooksConfig;
  xero: ProviderCredentials;
  zoho: ZohoConfig;
  webhook: WebhookConfig;
  rateLimit: RateLimitConfig;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  queue: QueueConfig;
  log: LogConfig;
  sentry: SentryConfig;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: EnvironmentVariables | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  load(): EnvironmentVariables {
    if (this.config) {
      return this.config;
    }

    this.validateRequiredEnvVars();

    this.config = {
      app: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
        logLevel: process.env.LOG_LEVEL || 'info',
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'talk_to_your_accounts',
        poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      encryption: {
        key: process.env.ENCRYPTION_KEY || this.generateFallbackKey(),
        ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10),
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'fallback-jwt-secret',
        expiration: process.env.JWT_EXPIRATION || '24h',
        refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
      },
      quickbooks: {
        clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
        redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || '',
        environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      },
      xero: {
        clientId: process.env.XERO_CLIENT_ID || '',
        clientSecret: process.env.XERO_CLIENT_SECRET || '',
        redirectUri: process.env.XERO_REDIRECT_URI || '',
      },
      zoho: {
        clientId: process.env.ZOHO_CLIENT_ID || '',
        clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
        redirectUri: process.env.ZOHO_REDIRECT_URI || '',
        dataCenter: process.env.ZOHO_DATA_CENTER || 'com',
      },
      webhook: {
        secret: process.env.WEBHOOK_SECRET || '',
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      },
      circuitBreaker: {
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
        errorThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
        resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
      },
      retry: {
        maxRetries: parseInt(process.env.MAX_RETRIES || '5', 10),
        initialDelay: parseInt(process.env.INITIAL_RETRY_DELAY || '1000', 10),
        multiplier: parseInt(process.env.RETRY_MULTIPLIER || '2', 10),
        maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000', 10),
        jitterRange: parseInt(process.env.RETRY_JITTER_RANGE || '100', 10),
      },
      queue: {
        namePrefix: process.env.QUEUE_NAME_PREFIX || 'ttya_integrations',
        priorities: {
          high: parseInt(process.env.JOB_PRIORITY_HIGH || '1', 10),
          medium: parseInt(process.env.JOB_PRIORITY_MEDIUM || '2', 10),
          low: parseInt(process.env.JOB_PRIORITY_LOW || '3', 10),
        },
      },
      log: {
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        dir: process.env.LOG_DIR || './logs',
      },
      sentry: {
        dsn: process.env.SENTRY_DSN || '',
      },
    };

    return this.config;
  }

  private validateRequiredEnvVars(): void {
    const requiredVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_NAME',
      'REDIS_HOST',
      'REDIS_PORT',
      'ENCRYPTION_KEY',
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }
  }

  private generateFallbackKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    const config = this.load();
    return config[key];
  }
}

export const config = ConfigLoader.getInstance().load();
export const getConfig = ConfigLoader.getInstance().get.bind(ConfigLoader.getInstance());
