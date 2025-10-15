# Configuration Guide

This guide covers all configuration options for Fast Relay routes.

## Configuration Priority

Fast Relay follows this priority order when loading configuration:

1. **GitHub Gist** (if `GIST_URL` or `GIST_ID` is set)
   - Fetches configuration on startup
   - Auto-syncs periodically based on `GIST_SYNC_INTERVAL`
   - Auto-restarts on changes if `GIST_AUTO_RESTART=true`

2. **Local `routes.json` file**
   - Auto-created from `routes.example.json` on first run
   - Ignored by Git (add your custom config safely)
   - Changes require manual server restart

3. **Environment variables** (legacy, not recommended)
   - `PROXY_ROUTES` or `TARGET_URLS`
   - Provided for backward compatibility only

## Route Configuration Format

### Basic Structure

Create or edit `routes.json`:

```json
{
  "$schema": "./routes.schema.json",
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/v1",
      "description": "Main API endpoint",
      "pathMode": "append",
      "responseMode": "proxy"
    }
  ]
}
```

### Route Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `source` | string | ✅ | - | Source path pattern (use `/*` for wildcards) |
| `target` | string | ✅ | - | Target URL (full URL with protocol) |
| `description` | string | ❌ | - | Human-readable description for documentation |
| `pathMode` | string | ❌ | `"append"` | How to handle wildcard paths: `"append"` or `"query"` |
| `queryParamName` | string | ❌ | `"path"` | Query parameter name when using `pathMode: "query"` |
| `responseMode` | string | ❌ | `"proxy"` | Response handling: `"proxy"` or `"custom"` |
| `customResponse` | object | ❌ | - | Custom response configuration (required if `responseMode: "custom"`) |

## Path Modes

### Append Mode (Default)

Appends the wildcard path to the target URL.

**Configuration:**
```json
{
  "source": "/api/v1/*",
  "target": "https://users-api.example.com/v1",
  "pathMode": "append"
}
```

**Example:**
```
Request:  /api/v1/users/123
Target:   https://users-api.example.com/v1
Result:   https://users-api.example.com/v1/users/123
```

**Use cases:**
- RESTful APIs
- File servers
- Standard proxy routing

### Query Mode

Passes the wildcard path as a query parameter.

**Configuration:**
```json
{
  "source": "/api/v2/*",
  "target": "https://orders-api.example.com/v2",
  "pathMode": "query",
  "queryParamName": "path"
}
```

**Example:**
```
Request:  /api/v2/orders/123
Target:   https://orders-api.example.com/v2
Result:   https://orders-api.example.com/v2?path=/orders/123
```

**Use cases:**
- APIs that expect path as parameter
- Legacy systems
- Custom routing logic on target server

## Response Modes

### Proxy Mode (Default)

Standard proxy behavior - waits for target response and returns it to client.

**Configuration:**
```json
{
  "source": "/api/*",
  "target": "https://api.example.com",
  "responseMode": "proxy"
}
```

**Behavior:**
1. Client sends request
2. Proxy forwards request to target
3. Proxy waits for target response
4. Proxy returns target response to client

**Use cases:**
- RESTful APIs
- Synchronous operations
- When client needs actual response data

### Custom Mode

Fire-and-forget with immediate custom response.

**Configuration:**
```json
{
  "source": "/webhook/*",
  "target": "https://webhooks.example.com/hooks",
  "pathMode": "query",
  "queryParamName": "path",
  "responseMode": "custom",
  "customResponse": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "success": true,
      "message": "Webhook received"
    }
  }
}
```

**Behavior:**
1. Client sends request
2. Proxy returns custom response immediately
3. Proxy forwards request to target asynchronously (background)
4. Target response is logged but not returned to client

**Use cases:**
- Webhook endpoints
- Async notifications
- Status/health check endpoints
- Fire-and-forget operations

## Custom Response Configuration

### JSON Response

```json
{
  "customResponse": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "value"
    },
    "body": {
      "success": true,
      "message": "Request received",
      "timestamp": "2025-10-15T00:00:00Z"
    }
  }
}
```

### Plain Text Response

```json
{
  "customResponse": {
    "status": 202,
    "body": "Accepted"
  }
```

### Custom Headers Only

```json
{
  "customResponse": {
    "status": 204,
    "headers": {
      "X-Request-ID": "req-123",
      "X-Processing-Time": "0ms"
    }
  }
}
```

**Note:** When `headers` are not specified, default `Content-Type` is set based on `body` type:
- Object/Array: `application/json`
- String: `text/plain`

## Configuration Examples

### Example 1: Multi-Service API Gateway

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "description": "User management service"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "description": "Order processing service"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "description": "Payment processing service"
    }
  ]
}
```

### Example 2: Development/Production Split

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

**Note:** More specific routes should come first!

### Example 3: Mixed Mode Configuration

```json
{
  "routes": [
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "pathMode": "query",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    },
    {
      "source": "/api/*",
      "target": "https://api.example.com",
      "pathMode": "append",
      "responseMode": "proxy"
    }
  ]
}
```

## Validation

Fast Relay validates your configuration on startup:

- ✅ JSON syntax
- ✅ Required fields (`source`, `target`)
- ✅ URL format and protocol (must be `http://` or `https://`)
- ✅ SSRF protection (blocks private IPs)
- ✅ Domain whitelist (if `ALLOWED_DOMAINS` is set)

**Common Validation Errors:**

```
❌ Missing required field: source
❌ Invalid target URL: must start with http:// or https://
❌ SSRF protection: target URL contains private IP address
❌ Domain not allowed: target domain not in ALLOWED_DOMAINS whitelist
```

## Route Matching Order

Routes are matched in the order they appear in `routes.json`.

**Example:**
```json
{
  "routes": [
    {"source": "/api/v1/users/*", "target": "https://users-v1.example.com"},
    {"source": "/api/v1/*", "target": "https://api-v1.example.com"},
    {"source": "/api/*", "target": "https://api.example.com"}
  ]
}
```

Request `/api/v1/users/123` will match the **first** route, not the second or third.

**Best Practice:** Put more specific routes before more general ones.

## Updating Configuration

### With GitHub Gist (Recommended)

1. Edit your Gist on GitHub
2. Save changes
3. Wait for sync interval (default: 5 minutes)
4. Server automatically restarts with new configuration ✨

### With Local File

1. Edit `routes.json`
2. Save changes
3. **Manually restart the server**

```bash
# Development
yarn dev

# Production
yarn build
yarn start:prod
```

## Troubleshooting

### Issue: Routes not loading

**Possible causes:**
- JSON syntax error
- Missing required fields
- Invalid URL format

**Solution:** Check server logs for validation errors

### Issue: Wrong route is matching

**Cause:** Route order matters!

**Solution:** Move more specific routes before general ones

### Issue: Configuration not updating

**For Gist users:**
- Check `GIST_SYNC_INTERVAL` is not set to 0
- Check `GIST_AUTO_RESTART` is set to true
- Verify Gist URL/ID is correct

**For local file users:**
- Remember to restart the server manually

## Related Documentation

- [Environment Variables](ENVIRONMENT.md) - Complete environment variable reference
- [Setup Guide](SETUP.md) - Interactive setup wizard
- [Examples](EXAMPLES.md) - Real-world configuration examples
- [Security](SECURITY.md) - Security best practices
