# Talk-to-Your-Accounts Enterprise Integrations

A comprehensive enterprise-grade integration infrastructure for connecting Talk-to-Your-Accounts with external accounting platforms including QuickBooks, Xero, and Zoho Books.

## Overview

This module provides all the necessary infrastructure to build a robust, scalable, and secure integration platform that enables seamless data exchange between Talk-to-Your-Accounts and popular accounting software. The infrastructure addresses the five critical areas identified for enterprise integrations:

- **OAuth 2.0 Authentication**: Secure token management for API access
- **Rate Limiting & Throttling**: Queue-based request management with exponential backoff
- **Webhook Security**: Signature verification and replay attack prevention
- **Enterprise Error Handling**: Circuit breakers and comprehensive error management
- **Multi-Tenant Architecture**: Tenant isolation and access control

## Features

### OAuth 2.0 Implementation
- Secure authentication flow for QuickBooks, Xero, and Zoho
- Token encryption at rest using AES-256-GCM
- Proactive token refresh before expiration
- Automatic retry on token expiration
- Scope-based authorization management

### API Rate Limiting & Throttling
- BullMQ-based job queue management
- Per-provider rate limit enforcement
- Exponential backoff with jitter
- Request prioritization (High/Medium/Low)
- Automatic retry with configurable attempts

### Webhook Security
- HMAC-SHA256 signature verification
- Replay attack prevention using Redis cache
- Duplicate delivery detection
- Timestamp validation
- Idempotent event processing

### Enterprise Error Handling
- Circuit breaker pattern for external API failures
- Comprehensive error categorization
- Structured logging with correlation IDs
- Automatic recovery mechanisms
- Detailed error context and metadata

### Multi-Tenant Architecture
- Logical tenant isolation
- Tenant-specific configurations
- Usage tracking and quota management
- Role-based access control
- AsyncLocalStorage for context propagation

## Quick Start

### Installation

```bash
cd enterprise-integrations
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=talk_to_your_accounts

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption (generate with: npm run key:generate)
ENCRYPTION_KEY=your-32-character-encryption-key

# OAuth Credentials
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
```

### Running the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Architecture

### Project Structure

```
enterprise-integrations/
├── src/
│   ├── config/                 # Configuration management
│   ├── core/
│   │   ├── encryption/         # AES-256-GCM encryption
│   │   ├── logging/            # Winston-based structured logging
│   │   ├── errors/             # Custom error classes
│   │   └── resilience/         # Circuit breaker & retry logic
│   └── modules/
│       ├── auth/               # OAuth 2.0 & token management
│       ├── webhooks/           # Webhook security & handlers
│       ├── queuing/            # Job queues & rate limiting
│       └── tenancy/            # Multi-tenant context
├── database/
│   ├── migrations/             # Database migrations
│   └── repositories/           # Data access layer
└── scripts/                    # Utility scripts
```

### Core Services

#### EncryptionService
Secures sensitive data using AES-256-GCM encryption.

```typescript
import { getEncryptionService } from '@core/encryption';

const encryption = getEncryptionService();
const encrypted = encryption.encrypt('sensitive data');
const decrypted = encryption.decrypt(encrypted);
```

#### LoggerService
Structured logging with correlation IDs for request tracking.

```typescript
import { getLogger } from '@core/logging';

const logger = getLogger();
logger.info('Request processed', { tenantId: 'tenant-123', correlationId: 'corr-456' });
```

#### CircuitBreakerService
Protects against cascading failures from external API issues.

```typescript
import { getCircuitBreaker } from '@core/resilience';

const breaker = getCircuitBreaker();
const result = await breaker.execute('quickbooks', async () => {
  return await quickbooksApi.getData();
});
```

#### RetryService
Implements exponential backoff retry logic.

```typescript
import { getRetryService } from '@core/resilience';

const retry = getRetryService();
const result = await retry.execute(async () => {
  return await riskyOperation();
}, { maxRetries: 3, initialDelay: 1000 });
```

### Authentication Module

#### OAuthService
Manages OAuth 2.0 authentication flows.

```typescript
import { getOAuthService, OAuthProvider } from '@modules/auth';

const oauth = getOAuthService();

// Get authorization URL
const authUrl = oauth.getAuthorizationUrl(OAuthProvider.QUICKBOOKS, 'state-token');

// Exchange code for tokens
const tokens = await oauth.exchangeCodeForTokens(
  OAuthProvider.QUICKBOOKS,
  'authorization-code',
  'tenant-id'
);

// Create API client
const apiClient = await oauth.createApiClient(OAuthProvider.QUICKBOOKS, tokens.accessToken);
```

#### TokenManagementService
Handles token lifecycle including automatic refresh.

```typescript
import { getTokenManagementService } from '@modules/auth';

const tokenService = getTokenManagementService();

// Get valid access token (refreshes if needed)
const result = await tokenService.getValidAccessToken('tenant-id', 'quickbooks');

if (result.success) {
  console.log('Access token:', result.accessToken);
} else {
  console.error('Error:', result.error);
}
```

### Webhook Module

#### WebhookSecurityService
Verifies incoming webhook signatures and prevents replay attacks.

```typescript
import { getWebhookSecurityService } from '@modules/webhooks';

const webhookSecurity = getWebhookSecurityService();

const result = await webhookSecurity.verifyWebhook(
  'quickbooks',
  JSON.stringify(payload),
  { 'X-Quickbooks-Signature': 'signature-value' }
);

if (result.valid) {
  console.log('Webhook verified:', result.payload);
}
```

#### WebhookHandlerService
Processes incoming webhook events with built-in handlers.

```typescript
import { getWebhookHandlerService } from '@modules/webhooks';

const webhookHandler = getWebhookHandlerService();

// Process incoming webhook
const deliveryLog = await webhookHandler.processWebhook(
  'quickbooks',
  JSON.stringify(payload),
  headers
);

console.log('Status:', deliveryLog.status);
```

### Queue Module

#### QueueService
Manages job queues with rate limiting.

```typescript
import { getQueueService, JobPriority, PROVIDER_RATE_LIMITS } from '@modules/queuing';

const queue = getQueueService();

// Add job to queue
const jobId = await queue.addJob({
  tenantId: 'tenant-123',
  provider: 'quickbooks',
  operation: 'sync_invoices',
  payload: { /* data */ },
  priority: JobPriority.HIGH
});

// Check rate limits
const rateLimit = await queue.checkRateLimit('quickbooks', PROVIDER_RATE_LIMITS.quickbooks);

if (!rateLimit.allowed) {
  console.log(`Retry after ${rateLimit.retryAfter} seconds`);
}
```

### Tenancy Module

#### TenancyService
Manages multi-tenant context and isolation.

```typescript
import { getTenancyService, tenancyMiddleware } from '@modules/tenancy';

const tenancy = getTenancyService();

// Create tenant
const tenant = await tenancy.createTenant({
  name: 'My Organization',
  plan: 'professional',
  limits: {
    apiCallsPerMonth: 100000,
    integrations: 10,
    users: 50
  }
});

// Run with tenant context
const result = await tenancy.runWithContext(tenant, 'correlation-id', async () => {
  // Tenant context is available here
  const tenantId = TenancyService.getTenantId();
  return { success: true, tenantId };
});

// Express middleware
app.use(tenancyMiddleware());
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment (development/production) | No |
| PORT | Server port | No |
| DB_* | Database configuration | Yes |
| REDIS_* | Redis configuration | Yes |
| ENCRYPTION_KEY | 32-character encryption key | Yes |
| *_CLIENT_ID | OAuth client IDs | For each provider |
| *_CLIENT_SECRET | OAuth client secrets | For each provider |
| WEBHOOK_SECRET | Webhook signing secret | Yes |

### Provider Configuration

Each accounting platform requires specific OAuth credentials:

**QuickBooks Online**
- Create app at: developer.intuit.com
- Set redirect URI to: `http://localhost:3000/auth/quickbooks/callback`
- Choose sandbox for testing, production for live

**Xero**
- Create app at: developer.xero.com
- Set redirect URI to: `http://localhost:3000/auth/xero/callback`
- Requires organization approval for production

**Zoho Books**
- Create app at: api-console.zoho.com
- Set redirect URI to: `http://localhost:3000/auth/zoho/callback`
- Select appropriate data center (com, eu, cn)

## Error Handling

### Error Codes

The module uses a comprehensive error code system:

```typescript
import { ErrorCode, ErrorMessages } from '@core/errors';

// Authentication errors (1xxx)
AUTH_TOKEN_EXPIRED, AUTH_TOKEN_INVALID, AUTH_OAUTH_FAILED

// Rate limit errors (2xxx)
RATE_LIMIT_EXCEEDED, RATE_LIMIT_WINDOW_FULL

// Circuit breaker errors (3xxx)
CIRCUIT_OPEN, CIRCUIT_HALF_OPEN

// Provider errors (5xxx)
PROVIDER_API_ERROR, PROVIDER_AUTH_ERROR, PROVIDER_RATE_LIMIT
```

### Custom Errors

```typescript
import { IntegrationError, AuthenticationError, RateLimitError } from '@core/errors';

// Throw authentication error
throw new AuthenticationError(
  'Token refresh failed',
  ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED,
  { tenantId, provider }
);

// Throw rate limit error
throw new RateLimitError(
  'Rate limit exceeded',
  currentCount,
  limit,
  retryAfter,
  { provider }
);
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest test/QueueService.test.ts
```

### Test Coverage

The module includes comprehensive tests for:

- OAuth authentication flows
- Token refresh and validation
- Webhook signature verification
- Rate limiting logic
- Circuit breaker behavior
- Retry mechanisms
- Multi-tenant isolation

## Monitoring

### Health Checks

```typescript
// Check circuit breaker status
const breakers = getCircuitBreaker().getAllStats();

// Check queue status
const status = await getQueueService().getQueueStatus('quickbooks');
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 3 }
```

### Logging

All logs include:
- Correlation ID for request tracing
- Tenant ID for multi-tenant filtering
- Provider name for debugging
- Timestamp in ISO format
- Structured metadata

```json
{
  "level": "info",
  "message": "OAuth token exchange - quickbooks - SUCCESS",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "enterprise-integrations",
  "tenantId": "tenant-123",
  "provider": "quickbooks",
  "action": "oauth_event",
  "correlationId": "corr-456"
}
```

## Security Considerations

### Data Encryption
- All tokens encrypted using AES-256-GCM
- Encryption keys derived using scrypt
- Secure key storage in environment variables

### Authentication
- OAuth 2.0 with secure token handling
- Automatic token refresh
- Scope-based authorization

### Network Security
- TLS 1.3 for all communications
- Rate limiting to prevent abuse
- Webhook signature verification

### Audit Trail
- Complete request/response logging
- Error tracking and alerting
- Compliance-ready audit logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues:
- Create a GitHub issue
- Contact: support@talktoyouraccounts.com

## Changelog

### Version 1.0.0
- Initial release
- OAuth 2.0 authentication
- Rate limiting and queuing
- Webhook security
- Circuit breaker and retry
- Multi-tenant architecture
