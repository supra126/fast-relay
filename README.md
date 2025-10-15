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
- 📦 **Multi-format support** - Handles JSON, form-data, file uploads, and text formats automatically

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

# Run interactive setup wizard (recommended)
yarn setup

# Start development server
yarn dev
```

> 💡 **Tip:** Use the [interactive setup wizard](docs/SETUP.md) to configure GitHub Gist integration easily!

## 💡 Core Concepts

### Simple Route Configuration

Create `routes.json` with your routing rules:

```json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://api.example.com/v1",
      "pathMode": "append"
    },
    {
      "source": "/webhook/*",
      "target": "https://webhooks.example.com",
      "pathMode": "query",
      "responseMode": "custom",
      "customResponse": {
        "status": 200,
        "body": "OK"
      }
    }
  ]
}
```

### Path Modes

**Append Mode** (default):
```
/api/v1/users/123 → https://api.example.com/v1/users/123
```

**Query Mode**:
```
/api/v2/orders/123 → https://api.example.com/v2?path=/orders/123
```

### Response Modes

**Proxy Mode** (default) - Wait for target response and return it to client

**Custom Mode** - Return immediate response, forward request asynchronously

Perfect for webhooks that don't need to wait for processing!

## 📚 Documentation

### Getting Started
- 🚀 [Quick Setup Guide](docs/SETUP.md) - 5-minute guided setup with wizard
- ⚙️ [Configuration Guide](docs/CONFIGURATION.md) - Complete route configuration reference
- 🔐 [Environment Variables](docs/ENVIRONMENT.md) - All environment settings explained

### Advanced Topics
- 🔒 [Security Guide](docs/SECURITY.md) - SSRF protection, authentication, best practices
- 💡 [Examples](docs/EXAMPLES.md) - Real-world configurations for common scenarios
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - Technical architecture and logging details

### Guides
- 📖 [GitHub Gist Setup](docs/GIST_SETUP.md) - Detailed Gist configuration guide

## 🔍 API Endpoints

### Health Check

```bash
GET /health
```

Always accessible without authentication.

### Proxy Routes

All configured routes are automatically registered based on your `routes.json`.

**With Authentication** (if `API_KEYS` is set):
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:8080/api/v1/users
```

## 🔧 Configuration Priority

1. **GitHub Gist** (if `GIST_URL` or `GIST_ID` is set) - Auto-syncs and restarts
2. **Local `routes.json`** - Auto-created from example on first run
3. **Environment variables** - Legacy support only

## 🚢 Deployment

### Railway

1. Fork this repository
2. Connect to Railway
3. Configure environment variables
4. Deploy!

Railway automatically handles:
- Dependency installation
- TypeScript compilation
- Server startup
- Auto-restart on crashes

## 📝 Example: Multi-Service Gateway

```json
{
  "routes": [
    {
      "source": "/users/*",
      "target": "https://users-service.example.com/api",
      "description": "User management"
    },
    {
      "source": "/orders/*",
      "target": "https://orders-service.example.com/api",
      "description": "Order processing"
    },
    {
      "source": "/payments/*",
      "target": "https://payments-service.example.com/api",
      "description": "Payment processing"
    }
  ]
}
```

## 🏗️ Technology Stack

- **Fastify 5.x** - High-performance web framework
- **TypeScript** - Type-safe development
- **@fastify/http-proxy** - Proxy middleware (for append mode)
- **@fastify/formbody** - Form URL-encoded body parser
- **@fastify/multipart** - Multipart form-data and file upload support
- **Native Fetch API** - Request forwarding (for query mode)
- **Pino** - Fast logging

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

**Need Help?**
- 📖 Check the [documentation](docs/)
- 🐛 Report issues on [GitHub](https://github.com/supra126/fast-relay/issues)
- 💬 Start a [discussion](https://github.com/supra126/fast-relay/discussions)
