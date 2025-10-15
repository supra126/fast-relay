# Configuration Examples

Real-world examples of Fast Relay configurations for common use cases.

## Example 1: Webhook Forwarding with Custom Response

**Scenario:** Forward webhooks from external services with immediate response.

**Use case:** GitHub webhooks, Stripe webhooks, any service that doesn't wait for processing.

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com/hooks",
      "description": "Webhook receiver with custom response",
      "pathMode": "query",
      "queryParamName": "path",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    }
  ]
}
```

**How it works:**
1. External service sends webhook to `/webhook/github`
2. Client immediately receives "OK" response
3. Request is forwarded to `https://webhooks.example.com/hooks?path=/github` in background
4. Processing happens asynchronously

**Benefits:**
- ✅ Fast response to external service
- ✅ No timeout issues
- ✅ Background processing

## Example 2: Multi-Service API Gateway

**Scenario:** Multiple microservices behind one proxy.

**Use case:** Consolidate multiple backend services under one domain.

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "pathMode": "append",
      "description": "User management service"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "pathMode": "append",
      "description": "Order processing service"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "pathMode": "append",
      "description": "Payment processing service"
    },
    {
      "source": "/notifications/*",
      "target": "https://notifications-service.example.com/api",
      "pathMode": "append",
      "description": "Notification service"
    }
  ]
}
```

**Example requests:**
```
GET /users/123 → https://users-service.example.com/api/123
POST /orders/create → https://orders-service.example.com/api/create
GET /payments/status/abc → https://payments-service.example.com/api/status/abc
```

## Example 3: Development/Staging Router

**Scenario:** Route specific paths to staging environment for testing.

**Use case:** Test new features without affecting production.

```json
{
  "routes": [
    {
      "source": "/api/beta/*",
      "target": "https://staging-api.example.com/v1",
      "description": "Beta features on staging",
      "pathMode": "append"
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com/v1",
      "description": "Production API",
      "pathMode": "append"
    }
  ]
}
```

**Note:** Order matters! More specific routes (`/api/beta/*`) must come before general ones (`/api/*`).

**Example requests:**
```
GET /api/beta/users → https://staging-api.example.com/v1/users (staging)
GET /api/users → https://api.example.com/v1/users (production)
```

## Example 4: Legacy API Migration

**Scenario:** Gradually migrate from old API to new API.

**Use case:** Maintain backward compatibility during migration.

```json
{
  "routes": [
    {
      "source": "/api/v2/*",
      "target": "https://new-api.example.com/api",
      "description": "New API (v2)",
      "pathMode": "append"
    },
    {
      "source": "/api/v1/*",
      "target": "https://legacy-api.example.com/api",
      "description": "Legacy API (v1)",
      "pathMode": "append"
    },
    {
      "source": "/api/*",
      "target": "https://new-api.example.com/api",
      "description": "Default to new API",
      "pathMode": "append"
    }
  ]
}
```

**Migration strategy:**
1. Start: All traffic to `legacy-api.example.com`
2. Add v2 route for new API
3. Gradually migrate endpoints
4. Finally, redirect default to new API

## Example 5: Query Parameter Routing

**Scenario:** Target API expects path as query parameter.

**Use case:** Integrate with legacy systems or specific API requirements.

```json
{
  "routes": [
    {
      "source": "/proxy/*",
      "target": "https://api.example.com/handler",
      "pathMode": "query",
      "queryParamName": "endpoint",
      "description": "Query-based routing"
    }
  ]
}
```

**Example requests:**
```
GET /proxy/users/123
→ https://api.example.com/handler?endpoint=/users/123

POST /proxy/orders/create
→ https://api.example.com/handler?endpoint=/orders/create
```

## Example 6: Status/Health Endpoints

**Scenario:** Custom responses for status endpoints without backend calls.

**Use case:** Quick status checks, health endpoints.

```json
{
  "routes": [
    {
      "source": "/status",
      "target": "https://backend.example.com/health",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "status": "ok",
          "service": "fast-relay",
          "timestamp": "2025-10-15T00:00:00Z"
        }
      }
    }
  ]
}
```

## Example 7: Mixed Response Modes

**Scenario:** Different response modes for different routes.

**Use case:** Combine synchronous and asynchronous operations.

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "responseMode": "custom",
      "customResponse": {
        "status": 202,
        "body": "Accepted"
      },
      "description": "Async webhooks"
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com",
      "responseMode": "proxy",
      "description": "Sync API calls"
    }
  ]
}
```

## Example 8: Multi-Format File Upload Proxy

**Scenario:** Forward file uploads with form data to backend.

**Use case:** Handle multipart/form-data and file uploads.

```json
{
  "routes": [
    {
      "source": "/upload/*",
      "target": "https://storage.example.com/api",
      "pathMode": "append",
      "description": "File upload endpoint"
    },
    {
      "source": "/form/*",
      "target": "https://forms.example.com/api",
      "pathMode": "append",
      "description": "Form submission endpoint"
    }
  ]
}
```

**Supports:**
- `multipart/form-data` (file uploads)
- `application/x-www-form-urlencoded` (form submissions)
- `application/json` (JSON data)
- Text formats (plain, html, xml, javascript)

## Example 9: API Key Protection

**Scenario:** Protect your proxy with API keys.

**Configuration in `.env`:**
```env
API_KEYS=client1-secure-key,client2-secure-key,admin-master-key
```

**Routes configuration:**
```json
{
  "routes": [
    {
      "source": "/api/*",
      "target": "https://protected-api.example.com",
      "description": "Protected API"
    }
  ]
}
```

**Client requests:**
```bash
# With Bearer token (recommended)
curl -H "Authorization: Bearer client1-secure-key" \
  https://your-proxy.com/api/users

# With X-API-Key header
curl -H "X-API-Key: client1-secure-key" \
  https://your-proxy.com/api/users
```

## Example 10: Domain Whitelist (SSRF Protection)

**Scenario:** Restrict proxy targets to trusted domains.

**Configuration in `.env`:**
```env
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com,specific-service.com
```

**Routes configuration:**
```json
{
  "routes": [
    {
      "source": "/external/*",
      "target": "https://api.example.com",
      "description": "Allowed by whitelist"
    }
  ]
}
```

**Blocked attempts:**
```json
{
  "source": "/bad/*",
  "target": "https://malicious.com"
}
```
→ **Error:** Domain not in ALLOWED_DOMAINS whitelist

## Complete Production Example

**Scenario:** Full production setup with security, monitoring, and multiple services.

**`.env` file:**
```env
# Server
PORT=8080
NODE_ENV=production
BODY_LIMIT=10485760

# GitHub Gist
GIST_ID=abc123def456
GITHUB_TOKEN=ghp_secure_token_here
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true

# Security
API_KEYS=web-client-key,mobile-client-key,internal-service-key
ALLOWED_DOMAINS=*.example.com,*.trusted-partner.com

# Performance
CORS_ORIGINS=https://app.example.com,https://admin.example.com
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute
```

**`routes.json`:**
```json
{
  "routes": [
    {
      "source": "/webhook/github/*",
      "target": "https://webhooks.example.com/github",
      "pathMode": "query",
      "queryParamName": "event",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      },
      "description": "GitHub webhooks (async)"
    },
    {
      "source": "/webhook/stripe/*",
      "target": "https://webhooks.example.com/stripe",
      "pathMode": "query",
      "queryParamName": "event",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      },
      "description": "Stripe webhooks (async)"
    },
    {
      "source": "/api/users/*",
      "target": "https://users.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "Users service"
    },
    {
      "source": "/api/orders/*",
      "target": "https://orders.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "Orders service"
    },
    {
      "source": "/api/payments/*",
      "target": "https://payments.example.com/api",
      "pathMode": "append",
      "responseMode": "proxy",
      "description": "Payments service"
    }
  ]
}
```

## Testing Your Configuration

```bash
# Test proxy route
curl https://your-proxy.com/api/users \
  -H "Authorization: Bearer web-client-key"

# Test webhook (should return immediately)
curl https://your-proxy.com/webhook/github/push \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"push"}'

# Test file upload
curl https://your-proxy.com/upload/avatar \
  -F "file=@avatar.png" \
  -H "Authorization: Bearer web-client-key"

# Health check (no auth required)
curl https://your-proxy.com/health
```

## Related Documentation

- [Configuration Guide](CONFIGURATION.md) - Detailed configuration options
- [Environment Variables](ENVIRONMENT.md) - All environment variables
- [Security Guide](SECURITY.md) - Security best practices
