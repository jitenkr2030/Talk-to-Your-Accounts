import { v4 as uuidv4 } from 'uuid';

export enum ErrorCode {
  // Authentication Errors (1xxx)
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_TOKEN_EXPIRED = 'AUTH_REFRESH_TOKEN_EXPIRED',
  AUTH_REFRESH_TOKEN_INVALID = 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_PROVIDER_NOT_FOUND = 'AUTH_PROVIDER_NOT_FOUND',
  AUTH_OAUTH_FAILED = 'AUTH_OAUTH_FAILED',
  AUTH_INSUFFICIENT_SCOPES = 'AUTH_INSUFFICIENT_SCOPES',

  // Rate Limit Errors (2xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_WINDOW_FULL = 'RATE_LIMIT_WINDOW_FULL',

  // Circuit Breaker Errors (3xxx)
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  CIRCUIT_HALF_OPEN = 'CIRCUIT_HALF_OPEN',
  CIRCUIT_TIMEOUT = 'CIRCUIT_TIMEOUT',

  // Webhook Errors (4xxx)
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_REPLAY_ATTACK = 'WEBHOOK_REPLAY_ATTACK',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',

  // Provider Errors (5xxx)
  PROVIDER_API_ERROR = 'PROVIDER_API_ERROR',
  PROVIDER_AUTH_ERROR = 'PROVIDER_AUTH_ERROR',
  PROVIDER_RATE_LIMIT = 'PROVIDER_RATE_LIMIT',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_CONFIG_MISSING = 'PROVIDER_CONFIG_MISSING',

  // Tenant Errors (6xxx)
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_INACTIVE = 'TENANT_INACTIVE',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
  TENANT_QUOTA_EXCEEDED = 'TENANT_QUOTA_EXCEEDED',

  // Validation Errors (7xxx)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Database Errors (8xxx)
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',

  // System Errors (9xxx)
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_UNEXPECTED = 'SYSTEM_UNEXPECTED',
  SYSTEM_CONFIG_MISSING = 'SYSTEM_CONFIG_MISSING',
}

export interface ErrorContext {
  correlationId?: string;
  tenantId?: string;
  provider?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export class IntegrationError extends Error {
  public readonly code: ErrorCode;
  public readonly correlationId: string;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly httpStatusCode: number;

  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    options: {
      isRetryable?: boolean;
      httpStatusCode?: number;
    } = {}
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.correlationId = context.correlationId || uuidv4();
    this.context = context;
    this.isRetryable = options.isRetryable ?? false;
    this.httpStatusCode = options.httpStatusCode ?? 500;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      correlationId: this.correlationId,
      context: this.context,
      isRetryable: this.isRetryable,
      httpStatusCode: this.httpStatusCode,
    };
  }
}

// Specific error classes for common scenarios
export class AuthenticationError extends IntegrationError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {}
  ) {
    super(message, code, context, {
      isRetryable: false,
      httpStatusCode: 401,
    });
  }
}

export class RateLimitError extends IntegrationError {
  public readonly retryAfter: number;
  public readonly currentCount: number;
  public readonly limit: number;

  constructor(
    message: string,
    currentCount: number,
    limit: number,
    retryAfter: number,
    context: ErrorContext = {}
  ) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, context, {
      isRetryable: true,
      httpStatusCode: 429,
    });
    this.retryAfter = retryAfter;
    this.currentCount = currentCount;
    this.limit = limit;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
      currentCount: this.currentCount,
      limit: this.limit,
    };
  }
}

export class CircuitBreakerError extends IntegrationError {
  public readonly provider: string;
  public readonly state: string;

  constructor(
    provider: string,
    state: 'OPEN' | 'HALF_OPEN',
    context: ErrorContext = {}
  ) {
    const code = state === 'OPEN' ? ErrorCode.CIRCUIT_OPEN : ErrorCode.CIRCUIT_HALF_OPEN;
    super(
      `Circuit breaker ${state.toLowerCase()} for provider: ${provider}`,
      code,
      { ...context, provider },
      {
        isRetryable: state === 'HALF_OPEN',
        httpStatusCode: 503,
      }
    );
    this.provider = provider;
    this.state = state;
  }
}

export class ProviderError extends IntegrationError {
  public readonly provider: string;
  public readonly providerErrorCode?: string;
  public readonly rawResponse?: unknown;

  constructor(
    message: string,
    provider: string,
    providerErrorCode?: string,
    rawResponse?: unknown,
    context: ErrorContext = {}
  ) {
    super(message, ErrorCode.PROVIDER_API_ERROR, { ...context, provider }, {
      isRetryable: true,
      httpStatusCode: 502,
    });
    this.provider = provider;
    this.providerErrorCode = providerErrorCode;
    this.rawResponse = rawResponse;
  }
}

export class ValidationError extends IntegrationError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly constraints?: string[];

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    constraints?: string[],
    context: ErrorContext = {}
  ) {
    super(message, ErrorCode.VALIDATION_FAILED, context, {
      isRetryable: false,
      httpStatusCode: 400,
    });
    this.field = field;
    this.value = value;
    this.constraints = constraints;
  }
}

export class TenantError extends IntegrationError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {}
  ) {
    super(message, code, context, {
      isRetryable: false,
      httpStatusCode: code === ErrorCode.TENANT_INACTIVE ? 403 : 404,
    });
  }
}

// Error factory for creating appropriate error types
export class ErrorFactory {
  static createFromAxiosError(
    error: unknown,
    provider: string,
    context: ErrorContext = {}
  ): IntegrationError {
    const axiosError = error as {
      response?: { status: number; data?: { error?: string } };
      message?: string;
      code?: string;
    };

    if (axiosError.response) {
      const status = axiosError.response.status;
      const message = axiosError.response.data?.error || axiosError.message;

      if (status === 401) {
        return new AuthenticationError(
          `Provider authentication failed: ${message}`,
          ErrorCode.PROVIDER_AUTH_ERROR,
          { ...context, provider }
        );
      }

      if (status === 429) {
        return new RateLimitError(
          `Rate limit exceeded for ${provider}`,
          0, // current count not available
          0, // limit not available
          60, // default retry after
          { ...context, provider }
        );
      }

      return new ProviderError(
        `Provider API error: ${message}`,
        provider,
        String(status),
        axiosError.response.data,
        context
      );
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return new ProviderError(
        `Provider timeout: ${provider}`,
        provider,
        'TIMEOUT',
        undefined,
        context
      );
    }

    return new IntegrationError(
      `Unexpected error: ${axiosError.message || 'Unknown error'}`,
      ErrorCode.SYSTEM_UNEXPECTED,
      context,
      { isRetryable: true }
    );
  }
}

// Error codes mapping for user-friendly messages
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid authentication token.',
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: 'Session refresh failed. Please log in again.',
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: 'Invalid refresh token.',
  [ErrorCode.AUTH_PROVIDER_NOT_FOUND]: 'Authentication provider not found.',
  [ErrorCode.AUTH_OAUTH_FAILED]: 'Authentication failed. Please try again.',
  [ErrorCode.AUTH_INSUFFICIENT_SCOPES]: 'Insufficient permissions. Please reconnect your account.',

  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again.',
  [ErrorCode.RATE_LIMIT_WINDOW_FULL]: 'Rate limit reached for this time window.',

  [ErrorCode.CIRCUIT_OPEN]: 'Service temporarily unavailable. Please try again later.',
  [ErrorCode.CIRCUIT_HALF_OPEN]: 'Service recovering. Please try again.',
  [ErrorCode.CIRCUIT_TIMEOUT]: 'Service timeout. Please try again.',

  [ErrorCode.WEBHOOK_SIGNATURE_INVALID]: 'Invalid webhook signature.',
  [ErrorCode.WEBHOOK_REPLAY_ATTACK]: 'Webhook request is a duplicate.',
  [ErrorCode.WEBHOOK_DELIVERY_FAILED]: 'Webhook delivery failed.',
  [ErrorCode.WEBHOOK_PROCESSING_FAILED]: 'Webhook processing failed.',

  [ErrorCode.PROVIDER_API_ERROR]: 'External service error. Please try again.',
  [ErrorCode.PROVIDER_AUTH_ERROR]: 'Authentication with external service failed.',
  [ErrorCode.PROVIDER_RATE_LIMIT]: 'External service rate limit exceeded.',
  [ErrorCode.PROVIDER_TIMEOUT]: 'External service timed out.',
  [ErrorCode.PROVIDER_NOT_FOUND]: 'External service not configured.',
  [ErrorCode.PROVIDER_CONFIG_MISSING]: 'Missing provider configuration.',

  [ErrorCode.TENANT_NOT_FOUND]: 'Account not found.',
  [ErrorCode.TENANT_INACTIVE]: 'Account is inactive.',
  [ErrorCode.TENANT_SUSPENDED]: 'Account is suspended.',
  [ErrorCode.TENANT_QUOTA_EXCEEDED]: 'Account quota exceeded.',

  [ErrorCode.VALIDATION_FAILED]: 'Validation failed.',
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Required field is missing.',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 'Invalid format.',

  [ErrorCode.DB_CONNECTION_FAILED]: 'Database connection failed.',
  [ErrorCode.DB_QUERY_FAILED]: 'Database query failed.',
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: 'Database constraint violation.',

  [ErrorCode.SYSTEM_ERROR]: 'An error occurred. Please try again.',
  [ErrorCode.SYSTEM_UNEXPECTED]: 'An unexpected error occurred.',
  [ErrorCode.SYSTEM_CONFIG_MISSING]: 'System configuration is missing.',
};
