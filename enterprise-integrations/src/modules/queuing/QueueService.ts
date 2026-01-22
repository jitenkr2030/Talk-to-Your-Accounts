import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getConfig } from '../../../config';
import { getLogger } from '../../../core/logging/LoggerService';
import { getRetryService } from '../../../core/resilience/RetryService';

export enum JobPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export interface QueueConfig {
  name: string;
  prefix: string;
  priorityRange: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface IntegrationJob {
  id?: string;
  tenantId: string;
  provider: string;
  operation: string;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  attempts?: number;
  maxAttempts?: number;
}

export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  attempts: number;
}

export class QueueService {
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();
  private retryService = getRetryService();
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private redis: Redis;
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(redisClient?: Redis) {
    this.config = getConfig();
    this.redis = redisClient || new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password || undefined,
      db: this.config.redis.db,
    });
  }

  /**
   * Create or get a queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queueName = `${this.config.queue.namePrefix}_${name}`;
      
      const queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          priority: JobPriority.MEDIUM,
          attempts: this.config.retry.maxRetries,
          backoff: {
            type: 'exponential',
            delay: this.config.retry.initialDelay,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      });

      this.queues.set(name, queue);
      this.logger.info(`Created queue: ${queueName}`, {
        action: 'queue_created',
        metadata: { queueName },
      });
    }

    return this.queues.get(name)!;
  }

  /**
   * Add a job to the queue
   */
  async addJob(job: IntegrationJob): Promise<string> {
    const queue = this.getQueue(job.provider);
    
    const jobId = job.id || `${job.tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await queue.add(
      job.operation,
      job,
      {
        jobId,
        priority: job.priority || JobPriority.MEDIUM,
        attempts: job.maxAttempts || this.config.retry.maxRetries,
      }
    );

    this.logger.debug(`Added job to queue: ${job.operation}`, {
      tenantId: job.tenantId,
      provider: job.provider,
      action: 'job_queued',
      metadata: { jobId, operation: job.operation },
    });

    return jobId;
  }

  /**
   * Add multiple jobs to the queue
   */
  async addBulkJobs(jobs: IntegrationJob[]): Promise<string[]> {
    const jobsByProvider = new Map<string, IntegrationJob[]>();
    
    for (const job of jobs) {
      const provider = job.provider;
      if (!jobsByProvider.has(provider)) {
        jobsByProvider.set(provider, []);
      }
      jobsByProvider.get(provider)!.push(job);
    }

    const jobIds: string[] = [];
    
    for (const [provider, providerJobs] of jobsByProvider) {
      const queue = this.getQueue(provider);
      const operations = providerJobs.map((job) => ({
        name: job.operation,
        data: job,
        opts: {
          jobId: job.id || `${job.tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          priority: job.priority || JobPriority.MEDIUM,
          attempts: job.maxAttempts || this.config.retry.maxRetries,
        },
      }));

      const addedJobs = await queue.addBulk(operations);
      jobIds.push(...addedJobs.map((j) => j.id || ''));
    }

    return jobIds.filter((id) => id !== '');
  }

  /**
   * Check and update rate limit for a provider
   */
  async checkRateLimit(provider: string, limit: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowEnd = now + limit.windowMs;
    const key = `ratelimit:${provider}`;

    try {
      const current = await this.redis.get(key);
      
      if (!current) {
        // First request in window
        await this.redis.setex(key, limit.windowMs / 1000, '1');
        return {
          allowed: true,
          remaining: limit.maxRequests - 1,
          resetTime: windowEnd,
        };
      }

      const count = parseInt(current, 10);
      
      if (count >= limit.maxRequests) {
        // Rate limit exceeded
        const ttl = await this.redis.ttl(key);
        
        this.logger.logRateLimit(provider, count, limit.maxRequests, limit.windowMs, {
          action: 'rate_limit_exceeded',
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime: windowEnd,
          retryAfter: ttl > 0 ? ttl : limit.windowMs / 1000,
        };
      }

      // Increment counter
      await this.redis.incr(key);
      
      return {
        allowed: true,
        remaining: limit.maxRequests - count - 1,
        resetTime: windowEnd,
      };
    } catch (error) {
      this.logger.error('Rate limit check failed', error as Error, {
        provider,
        action: 'rate_limit_check',
      });
      
      // On Redis failure, allow the request
      return {
        allowed: true,
        remaining: limit.maxRequests,
        resetTime: windowEnd,
      };
    }
  }

  /**
   * Create a worker for processing jobs
   */
  createWorker(
    name: string,
    processor: (job: Job<IntegrationJob>) => Promise<JobResult>
  ): Worker {
    const queue = this.getQueue(name);
    
    const worker = new Worker(
      queue.name,
      async (job) => {
        this.logger.debug(`Processing job: ${job.name}`, {
          tenantId: job.data.tenantId,
          provider: job.data.provider,
          action: 'job_processing',
          metadata: { jobId: job.id, attempt: job.attemptsMade },
        });

        try {
          const result = await processor(job);
          
          if (!result.success && job.attemptsMade < (job.opts.attempts || 3)) {
            throw new Error(result.error || 'Job failed');
          }

          return result;
        } catch (error) {
          this.logger.error('Job processing failed', error as Error, {
            tenantId: job.data.tenantId,
            provider: job.data.provider,
            action: 'job_processing_failed',
            metadata: { jobId: job.id, attempt: job.attemptsMade },
          });
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: 10,
      }
    );

    worker.on('completed', (job) => {
      this.logger.debug(`Job completed: ${job.name}`, {
        tenantId: job.data.tenantId,
        provider: job.data.provider,
        action: 'job_completed',
        metadata: { jobId: job.id },
      });
    });

    worker.on('failed', (job, error) => {
      this.logger.error(`Job failed: ${job?.name}`, error as Error, {
        tenantId: job?.data?.tenantId,
        provider: job?.data?.provider,
        action: 'job_failed',
        metadata: { jobId: job?.id, attempts: job?.attemptsMade },
      });
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Get queue status
   */
  async getQueueStatus(name: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(name);
    
    const counts = await queue.getJobCounts();
    
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(name: string): Promise<void> {
    const queue = this.getQueue(name);
    await queue.pause();
    this.logger.info(`Queue paused: ${name}`, { action: 'queue_paused' });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(name: string): Promise<void> {
    const queue = this.getQueue(name);
    await queue.resume();
    this.logger.info(`Queue resumed: ${name}`, { action: 'queue_resumed' });
  }

  /**
   * Clean up old jobs
   */
  async cleanQueue(name: string, grace: number = 3600000): Promise<void> {
    const queue = this.getQueue(name);
    
    await queue.clean(grace, 'completed');
    await queue.clean(grace * 24, 'failed');
    
    this.logger.info(`Queue cleaned: ${name}`, { action: 'queue_cleaned' });
  }

  /**
   * Close all queues and connections
   */
  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.workers.clear();

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();

    // Close Redis connection
    await this.redis.quit();
  }
}

// Singleton instance
let queueServiceInstance: QueueService | null = null;

export function getQueueService(redisClient?: Redis): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService(redisClient);
  }
  return queueServiceInstance;
}

// Provider-specific rate limit configurations
export const PROVIDER_RATE_LIMITS: Record<string, RateLimitConfig> = {
  quickbooks: {
    maxRequests: 60,
    windowMs: 60000, // 60 requests per minute
  },
  xero: {
    maxRequests: 60,
    windowMs: 60000, // 60 requests per minute
  },
  zoho: {
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
  },
};
