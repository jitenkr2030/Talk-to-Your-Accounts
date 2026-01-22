import { getConfig } from '../../config';
import { getLogger } from '../logging/LoggerService';
import { IntegrationError, ErrorCode } from '../errors/IntegrationErrors';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  multiplier?: number;
  maxDelay?: number;
  jitterRange?: number;
  retryOn?: number[] | ((error: unknown) => boolean);
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  attempts: number;
  result?: T;
  error?: unknown;
  totalTime: number;
}

export class RetryService {
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();

  constructor() {
    this.config = getConfig();
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxRetries = this.config.retry.maxRetries,
      initialDelay = this.config.retry.initialDelay,
      multiplier = this.config.retry.multiplier,
      maxDelay = this.config.retry.maxDelay,
      jitterRange = this.config.retry.jitterRange,
      retryOn,
      onRetry,
    } = options;

    let lastError: unknown;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        return {
          success: true,
          attempts: attempt + 1,
          result,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error;
        attempt++;

        // Check if we should retry
        if (attempt > maxRetries || !this.shouldRetry(error, retryOn)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(
          attempt - 1,
          initialDelay,
          multiplier,
          maxDelay,
          jitterRange
        );

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(attempt, error, delay);
        }

        this.logger.debug(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          action: 'retry_attempt',
          metadata: {
            attempt,
            maxRetries,
            delay,
            error: lastError instanceof Error ? lastError.message : String(lastError),
          },
        });

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempts: attempt,
      error: lastError,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown, retryOn?: number[] | ((error: unknown) => boolean)): boolean {
    // If no retry conditions specified, retry all errors
    if (!retryOn) {
      return true;
    }

    // If retryOn is an array of HTTP status codes
    if (Array.isArray(retryOn)) {
      const axiosError = error as {
        response?: { status: number };
      };
      if (axiosError?.response?.status) {
        return retryOn.includes(axiosError.response.status);
      }
      return true; // Retry non-HTTP errors by default
    }

    // If retryOn is a function, call it
    if (typeof retryOn === 'function') {
      return retryOn(error);
    }

    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number,
    maxDelay: number,
    jitterRange: number
  ): number {
    // Exponential backoff
    let delay = initialDelay * Math.pow(multiplier, attempt);

    // Apply maximum delay cap
    delay = Math.min(delay, maxDelay);

    // Add jitter (random variation)
    const jitter = Math.floor(Math.random() * jitterRange * 2) - jitterRange;
    delay = Math.max(0, delay + jitter);

    return delay;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable version of a function
   */
  retryable<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options?: RetryOptions
  ): T {
    return (async (...args: Parameters<T>) => {
      const result = await this.execute(() => fn(...args), options);
      if (result.success && result.result !== undefined) {
        return result.result;
      }
      throw result.error;
    }) as T;
  }

  /**
   * Retry a promise with a simpler API
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retry.maxRetries
  ): Promise<T> {
    const result = await this.execute(operation, { maxRetries });
    if (result.success && result.result !== undefined) {
      return result.result;
    }
    throw result.error;
  }
}

// Singleton instance
let retryServiceInstance: RetryService | null = null;

export function getRetryService(): RetryService {
  if (!retryServiceInstance) {
    retryServiceInstance = new RetryService();
  }
  return retryServiceInstance;
}

// Utility function to create retry options for specific providers
export function createRetryOptionsForProvider(provider: string): RetryOptions {
  return {
    maxRetries: 5,
    initialDelay: 1000,
    multiplier: 2,
    maxDelay: 30000,
    jitterRange: 100,
    retryOn: [429, 500, 502, 503, 504], // Retry on server errors and rate limits
    onRetry: (attempt, error, delay) => {
      const logger = getLogger();
      logger.debug(`Retrying ${provider} request`, {
        provider,
        action: 'retry_request',
        metadata: {
          attempt,
          delay,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    },
  };
}

// Pre-configured retry options for different scenarios
export const RetryPresets = {
  QUICKBOOKS: createRetryOptionsForProvider('QuickBooks'),
  XERO: createRetryOptionsForProvider('Xero'),
  ZOHO: createRetryOptionsForProvider('Zoho'),
  AGGRESSIVE: {
    maxRetries: 3,
    initialDelay: 500,
    multiplier: 2,
    maxDelay: 5000,
    jitterRange: 50,
    retryOn: [429, 500, 502, 503],
  },
  CONSERVATIVE: {
    maxRetries: 10,
    initialDelay: 2000,
    multiplier: 2,
    maxDelay: 60000,
    jitterRange: 200,
    retryOn: [429, 500, 502, 503, 504],
  },
};
