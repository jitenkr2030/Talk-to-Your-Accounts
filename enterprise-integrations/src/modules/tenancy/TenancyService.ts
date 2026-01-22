import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { getConfig } from '../../config';
import { getLogger } from '../logging/LoggerService';
import { TenantError, ErrorCode } from '../errors/IntegrationErrors';

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  limits: {
    apiCallsPerMonth: number;
    integrations: number;
    users: number;
    storage: number;
  };
  settings: TenantSettings;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  security: {
    mfaRequired: boolean;
    ipWhitelist: string[];
    sessionTimeout: number;
  };
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantStatus: 'active' | 'inactive' | 'suspended';
  tenantPlan: string;
  correlationId: string;
  requestId: string;
}

export interface TenantLimits {
  apiCallsRemaining: number;
  integrationsRemaining: number;
  usersRemaining: number;
  storageRemaining: number;
}

// Async local storage for tenant context
const tenantStorage = new AsyncLocalStorage<TenantContext>();

export class TenancyService {
  private config: ReturnType<typeof getConfig>;
  private logger = getLogger();
  private tenants: Map<string, Tenant> = new Map();

  constructor() {
    this.config = getConfig();
  }

  /**
   * Get the current tenant context
   */
  static getContext(): TenantContext | undefined {
    return tenantStorage.getStore();
  }

  /**
   * Get the current tenant ID
   */
  static getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
  }

  /**
   * Run a function within a tenant context
   */
  runWithContext<T>(
    tenant: Tenant,
    correlationId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const context: TenantContext = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      tenantPlan: tenant.plan,
      correlationId,
      requestId: uuidv4(),
    };

    return tenantStorage.run(context, fn);
  }

  /**
   * Run a function within a tenant context (synchronous)
   */
  runWithContextSync<T>(
    tenant: Tenant,
    correlationId: string,
    fn: () => T
  ): T {
    const context: TenantContext = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      tenantPlan: tenant.plan,
      correlationId,
      requestId: uuidv4(),
    };

    return tenantStorage.run(context, fn);
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant> {
    // In production, this would query a database
    const tenant = this.tenants.get(tenantId);
    
    if (!tenant) {
      throw new TenantError(
        `Tenant not found: ${tenantId}`,
        ErrorCode.TENANT_NOT_FOUND,
        { tenantId }
      );
    }

    return tenant;
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    const tenant: Tenant = {
      id: uuidv4(),
      name: data.name || 'New Organization',
      status: 'active',
      plan: data.plan || 'starter',
      limits: {
        apiCallsPerMonth: data.limits?.apiCallsPerMonth || 10000,
        integrations: data.limits?.integrations || 5,
        users: data.limits?.users || 10,
        storage: data.limits?.storage || 10737418240, // 10GB
      },
      settings: {
        defaultCurrency: data.settings?.defaultCurrency || 'USD',
        timezone: data.settings?.timezone || 'UTC',
        dateFormat: data.settings?.dateFormat || 'YYYY-MM-DD',
        notifications: {
          email: data.settings?.notifications?.email ?? true,
          webhook: data.settings?.notifications?.webhook ?? true,
          inApp: data.settings?.notifications?.inApp ?? true,
        },
        security: {
          mfaRequired: data.settings?.security?.mfaRequired ?? false,
          ipWhitelist: data.settings?.security?.ipWhitelist || [],
          sessionTimeout: data.settings?.security?.sessionTimeout || 3600,
        },
      },
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenant.id, tenant);
    
    this.logger.info('Tenant created', {
      tenantId: tenant.id,
      action: 'tenant_created',
      metadata: { tenantName: tenant.name, plan: tenant.plan },
    });

    return tenant;
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId);
    
    Object.assign(tenant, updates, { updatedAt: new Date() });
    
    this.logger.info('Tenant updated', {
      tenantId,
      action: 'tenant_updated',
    });

    return tenant;
  }

  /**
   * Check if tenant is active
   */
  async validateTenantStatus(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId);
    
    if (tenant.status === 'inactive') {
      throw new TenantError(
        `Tenant is inactive: ${tenantId}`,
        ErrorCode.TENANT_INACTIVE,
        { tenantId }
      );
    }

    if (tenant.status === 'suspended') {
      throw new TenantError(
        `Tenant is suspended: ${tenantId}`,
        ErrorCode.TENANT_SUSPENDED,
        { tenantId }
      );
    }

    return tenant;
  }

  /**
   * Check tenant limits
   */
  async checkTenantLimits(tenantId: string): Promise<TenantLimits> {
    const tenant = await this.getTenant(tenantId);
    
    // In production, this would check actual usage from database
    const usage = {
      apiCallsThisMonth: 0,
      activeIntegrations: 0,
      activeUsers: 0,
      storageUsed: 0,
    };

    return {
      apiCallsRemaining: tenant.limits.apiCallsPerMonth - usage.apiCallsThisMonth,
      integrationsRemaining: tenant.limits.integrations - usage.activeIntegrations,
      usersRemaining: tenant.limits.users - usage.activeUsers,
      storageRemaining: tenant.limits.storage - usage.storageUsed,
    };
  }

  /**
   * Check if tenant has exceeded limits
   */
  async checkQuotaExceeded(tenantId: string): Promise<{ exceeded: boolean; type?: string }> {
    const limits = await this.checkTenantLimits(tenantId);
    
    if (limits.apiCallsRemaining < 0) {
      return { exceeded: true, type: 'api_calls' };
    }
    if (limits.integrationsRemaining < 0) {
      return { exceeded: true, type: 'integrations' };
    }
    if (limits.usersRemaining < 0) {
      return { exceeded: true, type: 'users' };
    }
    if (limits.storageRemaining < 0) {
      return { exceeded: true, type: 'storage' };
    }

    return { exceeded: false };
  }

  /**
   * Record API call for usage tracking
   */
  async recordApiCall(tenantId: string): Promise<void> {
    // In production, this would increment usage counter in database
    this.logger.debug('API call recorded', {
      tenantId,
      action: 'api_call_recorded',
    });
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId);
    return tenant.settings;
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId);
    
    tenant.settings = { ...tenant.settings, ...settings };
    tenant.updatedAt = new Date();

    this.logger.info('Tenant settings updated', {
      tenantId,
      action: 'tenant_settings_updated',
    });

    return tenant.settings;
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId);
    tenant.status = 'suspended';
    tenant.updatedAt = new Date();

    this.logger.warn('Tenant suspended', {
      tenantId,
      action: 'tenant_suspended',
    });

    return tenant;
  }

  /**
   * Activate tenant
   */
  async activateTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId);
    tenant.status = 'active';
    tenant.updatedAt = new Date();

    this.logger.info('Tenant activated', {
      tenantId,
      action: 'tenant_activated',
    });

    return tenant;
  }

  /**
   * Deactivate tenant
   */
  async deactivateTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenant(tenantId);
    tenant.status = 'inactive';
    tenant.updatedAt = new Date();

    this.logger.info('Tenant deactivated', {
      tenantId,
      action: 'tenant_deactivated',
    });

    return tenant;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    const exists = this.tenants.has(tenantId);
    
    if (exists) {
      this.tenants.delete(tenantId);
      
      this.logger.info('Tenant deleted', {
        tenantId,
        action: 'tenant_deleted',
      });
    }

    return exists;
  }
}

// Singleton instance
let tenancyServiceInstance: TenancyService | null = null;

export function getTenancyService(): TenancyService {
  if (!tenancyServiceInstance) {
    tenancyServiceInstance = new TenancyService();
  }
  return tenancyServiceInstance;
}

// Middleware for Express.js
export function tenancyMiddleware() {
  return async (
    req: { headers: Record<string, string>; tenantId?: string },
    _res: unknown,
    next: () => void
  ): Promise<void> => {
    const tenantId = req.headers['x-tenant-id'] as string || req.tenantId;
    
    if (!tenantId) {
      next();
      return;
    }

    try {
      const tenancyService = getTenancyService();
      const tenant = await tenancyService.validateTenantStatus(tenantId);
      const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

      await tenancyService.runWithContext(tenant, correlationId, async () => {
        next();
      });
    } catch (error) {
      // Let error handler deal with it
      next();
    }
  };
}
