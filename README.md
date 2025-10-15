# Fast Relay

[English](README.md) | [繁體中文](README.zh-TW.md)

A lightweight, flexible HTTP proxy router with dynamic configuration support via GitHub Gist.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/deploy/6Mtv9w?referralCode=EnYHPz)

## ✨ Features

- 🚀 **Zero-config deployment** - Deploy to Railway in seconds
- 📝 **JSON-based routing** - Simple, readable route configuration
- 🔄 **Dynamic configuration** - Update routes via GitHub Gist without redeployment
- 🎯 **Flexible path modes** - Append or query parameter routing
- ⚡ **Custom responses** - Fire-and-forget async forwarding with immediate responses
- 🛡️ **Production-ready** - Built with Fastify for high performance
- 🔒 **Security built-in** - SSRF protection, optional API authentication, token masking
- 📊 **Detailed logging** - Track all requests and responses

## 🎯 Use Cases

- **Webhook forwarding** - Route webhooks from external services to your backend
- **API aggregation** - Combine multiple backend APIs under one endpoint
- **A/B testing** - Route traffic to different backends based on paths
- **Development proxies** - Proxy local development traffic to staging/production
- **Legacy API migration** - Gradually migrate APIs by routing specific paths

## 🚀 Quick Start

### Option 1: Deploy to Railway (Recommended)

1. Click the "Deploy on Railway" button above
2. Configure environment variables (optional)
3. Done! Your proxy is live

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/fast-relay.git
cd fast-relay

# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
yarn start:prod
```

## 📋 Configuration

### Configuration Priority

The application follows this priority order:

1. **GitHub Gist** (if `GIST_URL` or `GIST_ID` is set)
   - Fetches configuration on startup
   - Auto-syncs periodically
   - Auto-restarts on changes

2. **Local `routes.json`** file
   - Auto-created from `routes.example.json` on first run
   - Ignored by Git (add your custom config)

3. **Environment variables** (legacy, not recommended)
   - `PROXY_ROUTES` or `TARGET_URLS`

### Route Configuration Format

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
    },
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com/hooks",
      "description": "Webhook receiver",
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
  ]
}
```

### Configuration Options

#### Route Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `source` | string | ✅ | - | Source path pattern (use `/*` for wildcards) |
| `target` | string | ✅ | - | Target URL (full URL with protocol) |
| `description` | string | ❌ | - | Human-readable description |
| `pathMode` | string | ❌ | `"append"` | How to handle wildcard paths: `"append"` or `"query"` |
| `queryParamName` | string | ❌ | `"path"` | Query parameter name when using `pathMode: "query"` |
| `responseMode` | string | ❌ | `"proxy"` | Response handling: `"proxy"` or `"custom"` |
| `customResponse` | object | ❌ | - | Custom response configuration (required if `responseMode: "custom"`) |

#### Path Modes

**Append Mode** (default)
```
Request:  /api/v1/users/123
Target:   https://users-api.example.com/v1
Result:   https://users-api.example.com/v1/users/123
```

**Query Mode**
```
Request:  /api/v2/orders/123
Target:   https://orders-api.example.com/v2
Result:   https://orders-api.example.com/v2?path=/orders/123
```

#### Response Modes

**Proxy Mode** (default)
- Waits for target response
- Returns target's response to client
- Suitable for: APIs, synchronous operations

**Custom Mode**
- Returns custom response immediately
- Forwards request to target asynchronously (fire-and-forget)
- Logs target response in background
- Suitable for: Webhooks, async notifications, status endpoints

### Custom Response Configuration

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
      "message": "Request received"
    }
  }
}
```

Or simple text response:

```json
{
  "customResponse": {
    "status": 202,
    "body": "Accepted"
  }
}
```

## 🔧 Environment Variables

### Basic Configuration

```env
# Server settings
PORT=8080
HOST=0.0.0.0

# Node environment (development | production)
# In production mode, logger uses JSON format for better performance
NODE_ENV=development

# Request body size limit in bytes (default: 1MB)
# Adjust based on your needs. Example: 10485760 for 10MB
BODY_LIMIT=1048576
```

### Performance & Security

```env
# CORS configuration (optional)
# Comma-separated list of allowed origins
# Examples:
#   CORS_ORIGINS=https://app.example.com
#   CORS_ORIGINS=https://app.example.com,https://admin.example.com
#   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
# If not set, CORS is disabled
# CORS_ORIGINS=

# Rate limiting (default: 100 requests per minute)
# Protects your proxy from abuse and DDoS attacks
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

### Security Configuration (Optional)

```env
# API Keys authentication (optional)
# If set, all requests (except /health) will require authentication
# Supports single or multiple keys (comma-separated)
# Recommended: Use strong random keys with at least 16 characters
#
# Examples:
#   Single key:    API_KEYS=your-secure-api-key-here
#   Multiple keys: API_KEYS=client1-key,client2-key,admin-key
API_KEYS=your-secure-api-key-here

# Domain whitelist for proxy targets (optional, recommended for production)
# Prevents SSRF attacks by restricting allowed target domains
# Supports wildcards: *.example.com will match api.example.com, app.example.com, etc.
ALLOWED_DOMAINS=api.example.com,*.trusted-service.com
```

**Authentication Methods:**
- `Authorization: Bearer <key>` (recommended)
- `X-API-Key: <key>` header
- `?api_key=<key>` query parameter (legacy, not recommended)

**Security Features:**
- 🔒 **SSRF Protection** - Automatically blocks requests to private IPs (10.x, 172.16-31.x, 192.168.x, 127.x) and cloud metadata services (169.254.x)
- 🔑 **Optional Authentication** - Protect your proxy with API keys
- 🎭 **Token Masking** - GitHub tokens are masked in logs to prevent leakage
- ✅ **Environment Validation** - Checks for weak credentials and example values on startup

### GitHub Gist Configuration

#### Option 1: Public Gist (Simple)

```env
# Use the raw URL from your Gist
GIST_URL=https://gist.githubusercontent.com/username/gist-id/raw/routes.json

# Sync interval in seconds (default: 300, set to 0 to disable)
GIST_SYNC_INTERVAL=300

# Auto-restart on config changes (default: true)
GIST_AUTO_RESTART=true

# Gist fetch timeout in milliseconds (default: 10000 = 10 seconds)
# Maximum time to wait for Gist API response before timing out
GIST_FETCH_TIMEOUT=10000
```

#### Option 2: Private Gist (Secure)

```env
# Your Gist ID
GIST_ID=your-gist-id

# GitHub Personal Access Token (scope: gist)
# Create at: https://github.com/settings/tokens
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sync interval in seconds (default: 300, set to 0 to disable)
GIST_SYNC_INTERVAL=300

# Auto-restart on config changes (default: true)
GIST_AUTO_RESTART=true

# Gist fetch timeout in milliseconds (default: 10000 = 10 seconds)
GIST_FETCH_TIMEOUT=10000
```

### Legacy Configuration (Not Recommended)

```env
# Comma-separated route definitions
PROXY_ROUTES=/api/v1/*->https://api.example.com/v1,/webhook->https://webhooks.example.com/hooks

# Or simple target URL
TARGET_URLS=https://api.example.com
```

## 📚 GitHub Gist Setup Guide

> 📖 **For detailed instructions, see the [complete Gist setup guide](docs/GIST_SETUP.md)**

### Step 1: Create a Gist

1. Go to https://gist.github.com/
2. Create a new file named `routes.json`
3. Paste your route configuration
4. Choose "Create secret gist" (recommended) or "Create public gist"

### Step 2: Get the Raw URL

1. Open your Gist
2. Click the "Raw" button (top-right of the file)
3. Copy the URL (it looks like `https://gist.githubusercontent.com/username/abc123.../raw/routes.json`)

### Step 3: Configure Railway

In Railway:
1. Go to your project settings
2. Add environment variables:
   ```
   GIST_URL=<your-raw-url>
   GIST_SYNC_INTERVAL=30
   GIST_AUTO_RESTART=true
   ```
3. Redeploy (or wait for auto-deploy)

### Step 4: Update Configuration

1. Edit your Gist on GitHub
2. Click "Update secret gist"
3. Wait 30 seconds (or your configured interval)
4. Application automatically restarts with new configuration! ✨

### For Private Gists

If you want to keep your configuration private:

1. Create a Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: **gist** (only)
   - Generate and copy the token

2. Configure Railway:
   ```env
   GIST_ID=your-gist-id
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
   GIST_SYNC_INTERVAL=30
   ```

## 🔍 API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T00:00:00.000Z"
}
```

**Note:** Health check endpoint is always accessible without authentication.

### Proxy Routes

All configured routes are automatically registered based on your `routes.json` configuration.

#### Without Authentication

```bash
# If API_KEYS is not set
curl http://localhost:8080/api/v1/users
```

#### With Authentication

If `API_KEYS` environment variable is set, all routes (except `/health`) require authentication:

```bash
# Method 1: Bearer Token (recommended)
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/api/v1/users

# Method 2: X-API-Key Header
curl -H "X-API-Key: your-api-key" \
  http://localhost:8080/api/v1/users

# Method 3: Query Parameter (not recommended)
curl http://localhost:8080/api/v1/users?api_key=your-api-key
```

#### Authentication Errors

If authentication is enabled and credentials are invalid or missing:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

## 📊 Logging

The application provides detailed logging for debugging and monitoring:

```
[INFO] 🔄 Gist sync enabled, initializing configuration...
[INFO] ✅ Gist configuration loaded successfully (Raw URL)
[INFO] 💾 Configuration saved to local file
[INFO] 🎯 Route mappings:
[INFO]    /api/v1/* → https://users-api.example.com/v1 [append]
[INFO]    /webhook/* → https://webhooks.example.com/hooks [query: path] [custom response]
[INFO] 🚀 Proxy server started successfully!
[INFO] 📍 Listening at: http://0.0.0.0:8080
[INFO] 🔄 Gist configuration sync started {"intervalSeconds":300,"autoRestart":true}
```

### Request Logging

**Append Mode:**
```
[INFO] 📨 Request forwarding (Append mode) {
  "method": "POST",
  "from": "/api/v1/users",
  "to": "https://users-api.example.com/v1/users",
  "mode": "append"
}
```

**Query Mode with Custom Response:**
```
[INFO] 📨 Request forwarding (Query mode) {
  "method": "POST",
  "from": "/webhook/test",
  "to": "https://webhooks.example.com/hooks?path=/test",
  "mode": "query",
  "responseMode": "custom",
  "wildcardPath": "/test",
  "queryParam": "path=/test"
}
[INFO] ✅ Target response (Custom mode - async) {
  "targetUrl": "https://webhooks.example.com/hooks?path=/test",
  "status": 200,
  "responseTime": 156,
  "responseBody": "{\"success\":true,\"path\":\"/test\"...}"
}
```

## 🏗️ Architecture

### Technology Stack

- **Fastify 5.x** - High-performance web framework
- **TypeScript** - Type-safe development
- **@fastify/http-proxy** - Proxy middleware (for append mode)
- **Native Fetch API** - Request forwarding (for query mode)
- **Pino** - Fast logging

### Request Flow

```mermaid
graph TB
    Client[Client]
    Client -->|HTTP Request| Relay[Fast Relay - Fastify]

    subgraph Relay Processing
        Matcher[Route Matcher<br/>based on source path]
        Transformer[Path Transformer<br/>append / query mode]
        Handler[Response Handler<br/>proxy / custom mode]

        Matcher --> Transformer
        Transformer --> Handler
    end

    Relay --> Matcher
    Handler --> Decision{Response Mode?}

    Decision -->|Custom| CustomResp[Return Custom Response<br/>Immediately]
    Decision -->|Custom| AsyncForward[Forward to Target<br/>Asynchronously]
    CustomResp --> ClientReturn1[Client receives<br/>custom response]

    Decision -->|Proxy| ProxyWait[Wait for Target Response]
    ProxyWait --> ProxyReturn[Return Target Response<br/>to Client]
    ProxyReturn --> ClientReturn2[Client receives<br/>target response]
```

### Dynamic Configuration Sync

```mermaid
graph TB
    Gist[GitHub Gist]
    Gist -->|Every N seconds| Fetch[Fetch Latest Config]
    Fetch --> Compare[Compare with Current Config]
    Compare -->|Changed?| Decision{Config Changed?}
    Decision -->|No| Wait[Wait for Next Interval]
    Wait --> Fetch
    Decision -->|Yes| Save[Save to routes.json]
    Save --> Shutdown[Gracefully Shutdown]
    Shutdown --> Restart[Railway Auto-Restarts]
    Restart --> Load[Load New Configuration]
```

## 🔒 Security

### SSRF Protection

Fast Relay includes built-in protection against Server-Side Request Forgery (SSRF) attacks:

**Automatically Blocked:**
- Private IP ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Localhost: `127.0.0.0/8`, `localhost`, `0.0.0.0`
- Link-local addresses: `169.254.0.0/16` (AWS metadata service)
- Reserved IPs: `0.0.0.0/8`, `224.0.0.0/4` (multicast)

**Only Allowed:**
- `http://` and `https://` protocols
- Public IP addresses and domain names

**Additional Protection (Optional):**

Set `ALLOWED_DOMAINS` to restrict proxy targets to a whitelist:

```env
# Only allow specific domains
ALLOWED_DOMAINS=api.example.com,webhooks.example.com

# Support wildcard subdomains
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com
```

If a route configuration contains an unsafe target URL, it will be rejected on startup with an error message.

### API Authentication

API authentication is **optional** and disabled by default for ease of development.

**Enable Authentication:**

```env
# Single API key
API_KEYS=your-secure-random-key-here

# Multiple API keys (different clients)
API_KEYS=client1-key,client2-key,admin-key
```

**Best Practices:**
- ✅ Use strong random keys (at least 16 characters)
- ✅ Use Bearer token authentication in production
- ✅ Rotate keys periodically
- ❌ Don't use query parameters for sensitive APIs
- ❌ Don't commit real API keys to version control

### Token Masking

GitHub tokens and sensitive information are automatically masked in logs:

```
# Original
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz

# Logged as
token: "ghp_...wxyz"
```

This prevents accidental token leakage through log files or monitoring systems.

### Environment Validation

On startup, the application validates environment variables:

✅ **Checks for:**
- Weak or short API keys (< 16 characters)
- Example/placeholder values (`your-`, `example`, `changeme`, `your-secret-api-key`)
- Incorrect GitHub token formats
- Insecure default values

❌ **Startup will fail if:**
- Using example values in production
- API_KEYS contains obviously insecure values
- GITHUB_TOKEN contains placeholder values

## 🧪 Testing

```bash
# Run development server
yarn dev

# Test a route (no auth)
curl http://localhost:8080/api/v1/test

# Test with authentication
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/api/v1/test

# Check health
curl http://localhost:8080/health
```

## 🚢 Deployment

### Railway

1. Fork this repository
2. Connect to Railway
3. Configure environment variables
4. Deploy!

Railway will automatically:
- Detect the build configuration
- Install dependencies
- Build TypeScript
- Start the server
- Restart on crashes

### Docker (Coming Soon)

```bash
# Build
docker build -t fast-relay .

# Run
docker run -p 8080:8080 \
  -e GIST_URL=your-gist-url \
  fast-relay
```

## 📖 Examples

### Example 1: Webhook Forwarding with Custom Response

**Scenario:** Forward webhooks from external services with immediate response.

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

External service receives immediate "OK" response, while webhook is processed in the background.

### Example 2: API Aggregation

**Scenario:** Multiple microservices behind one proxy.

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "pathMode": "append",
      "description": "Users service"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "pathMode": "append",
      "description": "Orders service"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "pathMode": "append",
      "description": "Payments service"
    }
  ]
}
```

### Example 3: Development/Staging Router

**Scenario:** Route specific paths to staging environment.

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

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

