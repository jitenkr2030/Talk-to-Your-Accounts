import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../../config';
import { getLogger } from '../../../core/logging/LoggerService';
import { getWebhookSecurityService } from './WebhookSecurityService';
import { WebhookPayload } from './WebhookSecurityService';

export interface WebhookDeliveryLog {
  id: string;
  provider: string;
  eventType: string;
  deliveryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receivedAt: Date;
  processedAt?: Date;
  attempts: number;
  payload: string;
  response?: string;
  error?: string;
  correlationId?: string;
}

export interface WebhookHandlerResult {
  success: boolean;
  handler?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export type WebhookEventHandler = (
  payload: WebhookPayload,
  deliveryLog: WebhookDeliveryLog
) => Promise<WebhookHandlerResult>;

// Event type mappings for different providers
export const WEBHOOK_EVENT_MAPPINGS: Record<string, Record<string, string>> = {
  quickbooks: {
    'Invoice.created': 'invoice.created',
    'Invoice.updated': 'invoice.updated',
    'Invoice.deleted': 'invoice.deleted',
    'Payment.created': 'payment.created',
    'Payment.deleted': 'payment.deleted',
    'Customer.created': 'customer.created',
    'Customer.updated': 'customer.updated',
    'Item.created': 'item.created',
    'Item.updated': 'item.updated',
  },
  xero: {
    'INVOICE.CREATED': 'invoice.created',
    'INVOICE.UPDATED': 'invoice.updated',
    'INVOISE.DELETED': 'invoice.deleted',
    'PAYMENT.CREATED': 'payment.created',
    'PAYMENT.DELETED': 'payment.deleted',
    'CONTACT.CREATED': 'contact.created',
    'CONTACT.UPDATED': 'contact.updated',
  },
  zoho: {
    'invoice.created': 'invoice.created',
    'invoice.updated': 'invoice.updated',
    'invoice.sent': 'invoice.sent',
    'invoice.paid': 'invoice.paid',
    'payment.created': 'payment.created',
    'contact.created': 'contact.created',
    'contact.updated': 'contact.updated',
  },
};

export class WebhookHandlerService {
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();
  private securityService = getWebhookSecurityService();
  private handlers: Map<string, WebhookEventHandler> = new Map();
  private deliveryLogs: Map<string, WebhookDeliveryLog> = new Map();

  constructor() {
    this.config = getConfig();
    this.registerDefaultHandlers();
  }

  /**
   * Register default event handlers
   */
  private registerDefaultHandlers(): void {
    // Invoice handlers
    this.registerHandler('invoice.created', this.handleInvoiceCreated.bind(this));
    this.registerHandler('invoice.updated', this.handleInvoiceUpdated.bind(this));
    this.registerHandler('invoice.deleted', this.handleInvoiceDeleted.bind(this));

    // Payment handlers
    this.registerHandler('payment.created', this.handlePaymentCreated.bind(this));
    this.registerHandler('payment.deleted', this.handlePaymentDeleted.bind(this));

    // Contact handlers
    this.registerHandler('customer.created', this.handleCustomerCreated.bind(this));
    this.registerHandler('customer.updated', this.handleCustomerUpdated.bind(this));
  }

  /**
   * Register a webhook event handler
   */
  registerHandler(eventType: string, handler: WebhookEventHandler): void {
    this.handlers.set(eventType, handler);
    this.logger.info(`Registered webhook handler for event: ${eventType}`, {
      action: 'register_webhook_handler',
      metadata: { eventType },
    });
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    provider: string,
    payload: string,
    headers: Record<string, string>
  ): Promise<WebhookDeliveryLog> {
    const correlationId = uuidv4();
    const receivedAt = new Date();

    // Create delivery log
    const deliveryLog: WebhookDeliveryLog = {
      id: uuidv4(),
      provider,
      eventType: 'unknown',
      deliveryId: '',
      status: 'pending',
      receivedAt,
      attempts: 0,
      payload,
      correlationId,
    };

    try {
      // Verify webhook signature and parse payload
      const verification = await this.securityService.verifyWebhook(
        provider,
        payload,
        headers
      );

      if (!verification.valid || !verification.payload) {
        throw new Error('Webhook verification failed');
      }

      const webhookPayload = verification.payload;
      
      // Update delivery log with parsed data
      deliveryLog.eventType = webhookPayload.eventType;
      deliveryLog.deliveryId = webhookPayload.deliveryId;
      deliveryLog.status = 'processing';

      // Map provider-specific event to standard event
      const standardEvent = this.mapEventToStandard(provider, webhookPayload.eventType);
      deliveryLog.eventType = standardEvent;

      // Find and execute appropriate handler
      const handler = this.handlers.get(standardEvent);
      
      if (!handler) {
        this.logger.info(`No handler for event type: ${standardEvent}`, {
          provider,
          action: 'webhook_no_handler',
          metadata: { eventType: standardEvent },
        });
        
        deliveryLog.status = 'completed';
        deliveryLog.processedAt = new Date();
        
        return deliveryLog;
      }

      // Execute handler
      const result = await handler(webhookPayload, deliveryLog);
      
      deliveryLog.status = result.success ? 'completed' : 'failed';
      deliveryLog.processedAt = new Date();
      deliveryLog.response = result.result ? JSON.stringify(result.result) : undefined;
      deliveryLog.error = result.error;

      // Log webhook processing
      this.logger.logWebhook(
        provider,
        standardEvent,
        deliveryLog.deliveryId,
        result.success,
        {
          correlationId,
          tenantId: deliveryLog.correlationId,
          action: 'webhook_processed',
          metadata: {
            deliveryId: deliveryLog.id,
            result: result.success ? 'success' : 'failed',
          },
        }
      );

      return deliveryLog;
    } catch (error) {
      deliveryLog.status = 'failed';
      deliveryLog.processedAt = new Date();
      deliveryLog.error = error instanceof Error ? error.message : 'Unknown error';

      this.logger.logWebhook(
        provider,
        deliveryLog.eventType,
        deliveryLog.deliveryId,
        false,
        {
          correlationId,
          tenantId: deliveryLog.correlationId,
          action: 'webhook_processing_failed',
          metadata: {
            deliveryId: deliveryLog.id,
            error: deliveryLog.error,
          },
        }
      );

      return deliveryLog;
    } finally {
      // Store delivery log (would be saved to database)
      this.deliveryLogs.set(deliveryLog.id, deliveryLog);
    }
  }

  /**
   * Map provider-specific event to standard event
   */
  private mapEventToStandard(provider: string, eventType: string): string {
    const mappings = WEBHOOK_EVENT_MAPPINGS[provider.toLowerCase()];
    if (mappings) {
      return mappings[eventType] || eventType;
    }
    return eventType;
  }

  /**
   * Get delivery log by ID
   */
  getDeliveryLog(id: string): WebhookDeliveryLog | undefined {
    return this.deliveryLogs.get(id);
  }

  /**
   * Retry failed webhook delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDeliveryLog | null> {
    const deliveryLog = this.deliveryLogs.get(deliveryId);
    
    if (!deliveryLog || deliveryLog.status !== 'failed') {
      return null;
    }

    deliveryLog.attempts++;
    deliveryLog.status = 'processing';
    deliveryLog.error = undefined;

    try {
      const verification = await this.securityService.verifyWebhook(
        deliveryLog.provider,
        deliveryLog.payload,
        {}
      );

      if (!verification.valid || !verification.payload) {
        throw new Error('Webhook verification failed on retry');
      }

      const standardEvent = this.mapEventToStandard(
        deliveryLog.provider,
        verification.payload.eventType
      );

      const handler = this.handlers.get(standardEvent);
      
      if (!handler) {
        deliveryLog.status = 'completed';
        deliveryLog.processedAt = new Date();
        return deliveryLog;
      }

      const result = await handler(verification.payload, deliveryLog);
      
      deliveryLog.status = result.success ? 'completed' : 'failed';
      deliveryLog.processedAt = new Date();
      deliveryLog.response = result.result ? JSON.stringify(result.result) : undefined;
      deliveryLog.error = result.error;

      return deliveryLog;
    } catch (error) {
      deliveryLog.status = 'failed';
      deliveryLog.processedAt = new Date();
      deliveryLog.error = error instanceof Error ? error.message : 'Retry failed';

      return deliveryLog;
    }
  }

  // Default event handlers
  private async handleInvoiceCreated(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling invoice.created event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    // Process invoice creation
    // This would update local database, trigger workflows, etc.
    
    return { success: true, handler: 'invoice.created', result: { processed: true } };
  }

  private async handleInvoiceUpdated(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling invoice.updated event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'invoice.updated', result: { processed: true } };
  }

  private async handleInvoiceDeleted(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling invoice.deleted event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'invoice.deleted', result: { processed: true } };
  }

  private async handlePaymentCreated(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling payment.created event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'payment.created', result: { processed: true } };
  }

  private async handlePaymentDeleted(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling payment.deleted event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'payment.deleted', result: { processed: true } };
  }

  private async handleCustomerCreated(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling customer.created event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'customer.created', result: { processed: true } };
  }

  private async handleCustomerUpdated(
    payload: WebhookPayload,
    _deliveryLog: WebhookDeliveryLog
  ): Promise<WebhookHandlerResult> {
    this.logger.debug('Handling customer.updated event', {
      action: 'webhook_handler',
      metadata: { data: payload.data },
    });
    
    return { success: true, handler: 'customer.updated', result: { processed: true } };
  }
}

// Singleton instance
let webhookHandlerInstance: WebhookHandlerService | null = null;

export function getWebhookHandlerService(): WebhookHandlerService {
  if (!webhookHandlerInstance) {
    webhookHandlerInstance = new WebhookHandlerService();
  }
  return webhookHandlerInstance;
}
