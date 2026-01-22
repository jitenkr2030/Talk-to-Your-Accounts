import CircuitBreaker from 'opossum';
import { getConfig } from '../../config';
import { getLogger } from '../logging/LoggerService';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
  rollingCountTimeout?: number;
}

export interface CircuitBreakerStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  rejects: number;
  fire: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreakerService {
  private breakers: Map<string, CircuitBreaker<unknown>> = new Map();
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();

  constructor() {
    this.config = getConfig();
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  getBreaker(provider: string): CircuitBreaker<unknown> {
    if (!this.breakers.has(provider)) {
      this.breakers.set(provider, this.createBreaker(provider));
    }
    return this.breakers.get(provider)!;
  }

  /**
   * Create a new circuit breaker instance
   */
  private createBreaker(provider: string): CircuitBreaker<unknown> {
    const options: CircuitBreakerOptions = {
      timeout: this.config.circuitBreaker.timeout,
      errorThresholdPercentage: this.config.circuitBreaker.errorThreshold,
      resetTimeout: this.config.circuitBreaker.resetTimeout,
      volumeThreshold: 5, // Minimum requests before counting failures
      rollingCountTimeout: 10000, // 10 second rolling window
    };

    const breaker = new CircuitBreaker(async (...args: unknown[]) => {
      // This function will be wrapped by the circuit breaker
      return args[0];
    }, options);

    // Configure event handlers
    breaker.on('open', () => {
      this.logger.logCircuitBreaker(provider, CircuitState.CLOSED, CircuitState.OPEN);
    });

    breaker.on('halfOpen', () => {
      this.logger.logCircuitBreaker(provider, CircuitState.OPEN, CircuitState.HALF_OPEN);
    });

    breaker.on('close', () => {
      this.logger.logCircuitBreaker(provider, CircuitState.HALF_OPEN, CircuitState.CLOSED);
    });

    breaker.on('fallback', (result: unknown) => {
      this.logger.debug(`Circuit breaker fallback triggered for ${provider}`, {
        provider,
        action: 'circuit_breaker_fallback',
      });
    });

    breaker.on('reject', () => {
      this.logger.warn(`Circuit breaker rejected request for ${provider}`, {
        provider,
        action: 'circuit_breaker_reject',
      });
    });

    this.breakers.set(provider, breaker);
    return breaker;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    provider: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const breaker = this.getBreaker(provider);

    if (fallback) {
      breaker.fallback(fallback);
    }

    try {
      return await breaker.fire(operation);
    } catch (error) {
      // Re-throw for caller to handle
      throw error;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(provider: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(provider);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.status.state as CircuitBreakerStats['state'],
      failures: breaker.status.metrics?.failureCount || 0,
      successes: breaker.status.metrics?.successCount || 0,
      rejects: breaker.status.metrics?.rejectedCount || 0,
      fire: breaker.status.metrics?.fireCount || 0,
    };
  }

  /**
   * Force open a circuit breaker (for maintenance)
   */
  open(provider: string): void {
    const breaker = this.breakers.get(provider);
    if (breaker) {
      breaker.open();
      this.logger.warn(`Circuit breaker manually opened for ${provider}`, {
        provider,
        action: 'circuit_breaker_manual_open',
      });
    }
  }

  /**
   * Force close a circuit breaker (for maintenance)
   */
  close(provider: string): void {
    const breaker = this.breakers.get(provider);
    if (breaker) {
      breaker.close();
      this.logger.info(`Circuit breaker manually closed for ${provider}`, {
        provider,
        action: 'circuit_breaker_manual_close',
      });
    }
  }

  /**
   * Reset a circuit breaker
   */
  reset(provider: string): void {
    const breaker = this.breakers.get(provider);
    if (breaker) {
      breaker.close();
      breaker.reset();
      this.logger.info(`Circuit breaker reset for ${provider}`, {
        provider,
        action: 'circuit_breaker_reset',
      });
    }
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    this.breakers.forEach((_, provider) => {
      const breakerStats = this.getStats(provider);
      if (breakerStats) {
        stats.set(provider, breakerStats);
      }
    });
    return stats;
  }
}

// Singleton instance
let circuitBreakerInstance: CircuitBreakerService | null = null;

export function getCircuitBreaker(): CircuitBreakerService {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreakerService();
  }
  return circuitBreakerInstance;
}

export { CircuitBreaker };
