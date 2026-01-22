import * as crypto from 'crypto';
import { getConfig } from '../../config';
import { getLogger } from '../logging/LoggerService';
import {
  IntegrationError,
  ValidationError,
  ErrorCode,
} from '../errors/IntegrationErrors';
import Redis from 'ioredis';

export interface WebhookPayload {
  provider: string;
  eventType: string;
  deliveryId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  payload?: WebhookPayload;
}

export class WebhookSecurityService {
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();
  private redis: Redis | null = null;
  private duplicateCacheWindow = 600000; // 10 minutes in milliseconds

  constructor(redisClient?: Redis) {
    this.config = getConfig();
    this.redis = redisClient || null;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    payload: string,
    signature: string | undefined,
    secret: string
  ): WebhookVerificationResult {
    if (!signature) {
      return { valid: false, error: 'Missing signature' };
    }

    try {
      // Different providers use different header names and algorithms
      // QuickBooks: uses HMAC-SHA256
      // Xero: uses HMAC-SHA256
      // Zoho: uses HMAC-SHA256
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return { valid: false, error: 'Invalid signature length' };
      }

      const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error('Signature verification error', error as Error, {
        action: 'webhook_signature_verification',
      });
      return { valid: false, error: 'Signature verification failed' };
    }
  }

  /**
   * Verify webhook from specific provider
   */
  async verifyWebhook(
    provider: string,
    payload: string,
    headers: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    const signature = this.getSignatureHeader(provider, headers);
    const secret = this.config.webhook.secret;

    // Verify signature
    const signatureResult = this.verifySignature(payload, signature, secret);
    if (!signatureResult.valid) {
      this.logger.warn(`Webhook signature verification failed for ${provider}`, {
        provider,
        action: 'webhook_signature_failed',
        metadata: { error: signatureResult.error },
      });
      throw new ValidationError(
        `Webhook signature verification failed: ${signatureResult.error}`,
        'signature',
        payload,
        [signatureResult.error || 'Invalid signature']
      );
    }

    // Parse and validate payload
    let parsedPayload: WebhookPayload;
    try {
      parsedPayload = JSON.parse(payload) as WebhookPayload;
    } catch (error) {
      throw new ValidationError(
        'Invalid webhook payload format',
        'payload',
        payload,
        ['JSON parsing failed']
      );
    }

    // Check for replay attacks
    const replayCheck = await this.checkReplayAttack(provider, parsedPayload.deliveryId);
    if (!replayCheck.valid) {
      this.logger.warn(`Webhook replay attack detected for ${provider}`, {
        provider,
        action: 'webhook_replay_attack',
        metadata: { deliveryId: parsedPayload.deliveryId },
      });
      throw new IntegrationError(
        'Webhook delivery is a duplicate or replay attack',
        ErrorCode.WEBHOOK_REPLAY_ATTACK,
        { provider, action: 'webhook_processing' }
      );
    }

    // Validate timestamp (if provider includes one)
    if (parsedPayload.timestamp) {
      const timestampValidation = this.validateTimestamp(parsedPayload.timestamp);
      if (!timestampValidation.valid) {
        throw new ValidationError(
          `Webhook timestamp validation failed: ${timestampValidation.error}`,
          'timestamp',
          parsedPayload.timestamp,
          [timestampValidation.error || 'Invalid timestamp']
        );
      }
    }

    return {
      valid: true,
      payload: parsedPayload,
    };
  }

  /**
   * Check for replay attacks using Redis cache
   */
  async checkReplayAttack(provider: string, deliveryId: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.redis) {
      // If Redis is not available, skip replay check (not recommended for production)
      this.logger.warn('Redis not available, skipping replay attack check', {
        provider,
        action: 'webhook_replay_check',
      });
      return { valid: true };
    }

    const cacheKey = `webhook:${provider}:${deliveryId}`;
    
    try {
      const existing = await this.redis.get(cacheKey);
      
      if (existing) {
        return { valid: false, error: 'Duplicate delivery ID' };
      }

      // Mark this delivery as processed
      await this.redis.setex(cacheKey, this.duplicateCacheWindow / 1000, Date.now().toString());
      
      return { valid: true };
    } catch (error) {
      this.logger.error('Replay attack check failed', error as Error, {
        provider,
        action: 'webhook_replay_check',
      });
      // On Redis failure, allow the request but log the issue
      return { valid: true };
    }
  }

  /**
   * Validate webhook timestamp
   */
  private validateTimestamp(timestamp: string): { valid: boolean; error?: string } {
    try {
      const webhookTime = new Date(timestamp).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Check if timestamp is within acceptable range
      if (Math.abs(now - webhookTime) > fiveMinutes) {
        return { valid: false, error: 'Timestamp too old or too far in the future' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid timestamp format' };
    }
  }

  /**
   * Extract signature header based on provider
   */
  private getSignatureHeader(provider: string, headers: Record<string, string>): string | undefined {
    // Provider-specific header names
    const headerMappings: Record<string, string[]> = {
      quickbooks: ['x-quickbooks-signature', 'X-Quickbooks-Signature', 'X-QB-Signature'],
      xero: ['x-xero-signature', 'X-Xero-Signature'],
      zoho: ['x-zoho-signature', 'X-Zoho-Signature'],
    };

    const providerHeaders = headerMappings[provider.toLowerCase()] || [];
    
    for (const header of providerHeaders) {
      if (headers[header]) {
        return headers[header];
      }
    }

    // Generic fallback
    return headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
  }

  /**
   * Generate webhook signature for outgoing webhooks
   */
  generateSignature(payload: string, secret?: string): string {
    const signingSecret = secret || this.config.webhook.secret;
    return crypto
      .createHmac('sha256', signingSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Set Redis client for replay attack prevention
   */
  setRedisClient(redisClient: Redis): void {
    this.redis = redisClient;
  }

  /**
   * Clean up old replay attack cache entries
   */
  async cleanupCache(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // This would need to be implemented with a more sophisticated approach
      // For now, Redis TTL will handle cleanup
      this.logger.info('Webhook cache cleanup triggered', {
        action: 'webhook_cache_cleanup',
      });
    } catch (error) {
      this.logger.error('Cache cleanup failed', error as Error, {
        action: 'webhook_cache_cleanup',
      });
    }
  }
}

// Singleton instance
let webhookSecurityInstance: WebhookSecurityService | null = null;

export function getWebhookSecurityService(redisClient?: Redis): WebhookSecurityService {
  if (!webhookSecurityInstance) {
    webhookSecurityInstance = new WebhookSecurityService(redisClient);
  }
  return webhookSecurityInstance;
}
