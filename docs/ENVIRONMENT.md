# Environment Variables

Complete reference for all environment variables supported by Fast Relay.

## Quick Reference

```env
# Server
PORT=8080
HOST=0.0.0.0
NODE_ENV=development
BODY_LIMIT=10485760

# GitHub Gist (choose one method)
GIST_URL=https://gist.githubusercontent.com/...
# OR
GIST_ID=abc123
GITHUB_TOKEN=ghp_xxxxx

# Gist Sync
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# Security (optional)
API_KEYS=key1,key2,key3
ALLOWED_DOMAINS=*.example.com

# Performance
CORS_ORIGINS=https://app.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

## Server Configuration

### PORT

**Type:** Number
**Default:** `8080`
**Required:** No

The port number the server will listen on.

```env
PORT=8080
```

**Railway/Cloud:** Set to `$PORT` to use the platform-assigned port:
```env
PORT=$PORT
```

### HOST

**Type:** String
**Default:** `0.0.0.0`
**Required:** No

The host address the server will bind to.

```env
# Listen on all interfaces (default)
HOST=0.0.0.0

# Listen on localhost only (development)
HOST=127.0.0.1
```

### NODE_ENV

**Type:** String
**Values:** `development` | `production`
**Default:** `development`
**Required:** No

Determines the runtime environment.

```env
NODE_ENV=production
```

**Effects:**
- `development`: Pretty-printed logs, verbose output
- `production`: JSON-formatted logs, optimized performance, stricter validation

### BODY_LIMIT

**Type:** Number (bytes)
**Default:** `10485760` (10MB)
**Required:** No

Maximum size of request body.

```env
# 1MB
BODY_LIMIT=1048576

# 10MB (default)
BODY_LIMIT=10485760

# 50MB
BODY_LIMIT=52428800
```

**Use cases:**
- Small payloads: 1MB
- Standard APIs: 10MB
- File uploads: 50MB+

## GitHub Gist Configuration

### Method 1: Public Gist (via Raw URL)

#### GIST_URL

**Type:** String (URL)
**Required:** No (unless using Gist)

Raw URL of your GitHub Gist configuration.

```env
GIST_URL=https://gist.githubusercontent.com/username/abc123.../raw/routes.json
```

**How to get:**
1. Open your Gist on GitHub
2. Click "Raw" button
3. Copy the URL

**Note:** Works with both public and secret Gists.

### Method 2: Private Gist (via Gist ID + Token)

#### GIST_ID

**Type:** String
**Required:** No (unless using private Gist)

Your GitHub Gist ID.

```env
GIST_ID=abc123def456
```

**How to get:**
- From Gist URL: `https://gist.github.com/username/abc123def456`
- The ID is: `abc123def456`

#### GITHUB_TOKEN

**Type:** String
**Required:** Yes (when using `GIST_ID`)

GitHub Personal Access Token with `gist` scope.

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to create:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: **gist** (only)
4. Generate and copy the token

**Security:**
- ✅ Token is automatically masked in logs
- ✅ Use `.env` file (never commit to Git)
- ✅ Rotate tokens periodically
- ❌ Never use in example/placeholder format in production

### Gist Sync Settings

#### GIST_SYNC_INTERVAL

**Type:** Number (seconds)
**Default:** `300` (5 minutes)
**Required:** No

How often to check for configuration updates.

```env
# Check every 30 seconds
GIST_SYNC_INTERVAL=30

# Check every 5 minutes (default)
GIST_SYNC_INTERVAL=300

# Disable automatic sync
GIST_SYNC_INTERVAL=0
```

**Recommendations:**
- Development: 30-60 seconds
- Production: 300 seconds (5 minutes)
- Disable if using local file only: 0

#### GIST_AUTO_RESTART

**Type:** Boolean
**Default:** `true`
**Required:** No

Automatically restart server when configuration changes.

```env
# Auto-restart on changes (default)
GIST_AUTO_RESTART=true

# Manual restart required
GIST_AUTO_RESTART=false
```

**Note:** On Railway/cloud platforms, restart triggers automatic redeployment.

#### GIST_FETCH_TIMEOUT

**Type:** Number (milliseconds)
**Default:** `10000` (10 seconds)
**Required:** No

Maximum time to wait for Gist API response.

```env
# 5 seconds
GIST_FETCH_TIMEOUT=5000

# 10 seconds (default)
GIST_FETCH_TIMEOUT=10000

# 30 seconds (slow network)
GIST_FETCH_TIMEOUT=30000
```

## Security Configuration

### API_KEYS

**Type:** String (comma-separated)
**Required:** No
**Default:** None (authentication disabled)

API keys for request authentication.

```env
# Single key
API_KEYS=your-secure-random-key-here

# Multiple keys (different clients)
API_KEYS=key-for-client1,key-for-client2,admin-master-key
```

**Authentication methods:**
1. Bearer token: `Authorization: Bearer <key>`
2. API key header: `X-API-Key: <key>`
3. Query parameter: `?api_key=<key>` (not recommended)

**Best practices:**
- ✅ Use strong random keys (at least 16 characters)
- ✅ Use Bearer token in production
- ✅ Rotate keys periodically
- ❌ Don't use query parameters for sensitive APIs
- ❌ Don't commit real keys to version control

**Validation:**
- Startup fails if using example values in production
- Warns if keys are shorter than 16 characters

### ALLOWED_DOMAINS

**Type:** String (comma-separated)
**Required:** No
**Default:** None (all public domains allowed)

Whitelist of allowed target domains for SSRF protection.

```env
# Specific domains
ALLOWED_DOMAINS=api.example.com,webhooks.example.com

# Wildcard subdomains
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com

# Mixed
ALLOWED_DOMAINS=api.example.com,*.internal-services.com
```

**Wildcard matching:**
- `*.example.com` matches: `api.example.com`, `app.example.com`
- `*.example.com` does NOT match: `example.com` (use both if needed)

**Note:** Always blocks private IPs regardless of this setting.

## Performance & Security

### CORS_ORIGINS

**Type:** String (comma-separated)
**Required:** No
**Default:** None (CORS disabled)

Allowed origins for Cross-Origin Resource Sharing.

```env
# Single origin
CORS_ORIGINS=https://app.example.com

# Multiple origins
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Note:** If not set, CORS is completely disabled.

### RATE_LIMIT_MAX

**Type:** Number
**Default:** `100`
**Required:** No

Maximum number of requests per window.

```env
# Strict
RATE_LIMIT_MAX=50

# Default
RATE_LIMIT_MAX=100

# Relaxed
RATE_LIMIT_MAX=1000
```

### RATE_LIMIT_WINDOW

**Type:** String
**Default:** `1 minute`
**Required:** No

Time window for rate limiting.

```env
# Per second
RATE_LIMIT_WINDOW=1 second

# Per minute (default)
RATE_LIMIT_WINDOW=1 minute

# Per hour
RATE_LIMIT_WINDOW=1 hour
```

**Format:** `<number> <unit>` where unit can be:
- `second` / `seconds`
- `minute` / `minutes`
- `hour` / `hours`

## Legacy Configuration (Not Recommended)

### PROXY_ROUTES

**Type:** String (comma-separated routes)
**Required:** No

Legacy route definition format.

```env
PROXY_ROUTES=/api/v1/*->https://api.example.com/v1,/webhook->https://webhooks.example.com
```

**Limitation:** Does not support custom responses or query mode.

### TARGET_URLS

**Type:** String (URL)
**Required:** No

Simple single-target proxy.

```env
TARGET_URLS=https://api.example.com
```

**Limitation:** All requests go to the same target.

## Environment File (.env)

### Example .env file

```env
# Server
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
BODY_LIMIT=10485760

# GitHub Gist (Private)
GIST_ID=abc123def456
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GIST_SYNC_INTERVAL=300
GIST_AUTO_RESTART=true
GIST_FETCH_TIMEOUT=10000

# Security
API_KEYS=client1-secure-key,client2-secure-key
ALLOWED_DOMAINS=*.example.com,*.trusted-api.com

# Performance
CORS_ORIGINS=https://app.example.com,https://admin.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

### Loading Priority

1. `.env` file in project root
2. System environment variables
3. Default values

## Validation

Fast Relay validates environment variables on startup:

✅ **Checks:**
- GitHub token format (must start with `ghp_` or `github_pat_`)
- API keys length and strength
- Example/placeholder values in production
- URL formats

❌ **Startup fails if:**
- Using `your-`, `example`, `changeme` in production `API_KEYS`
- Using placeholder `GITHUB_TOKEN` in production
- Required variables missing when needed

## Troubleshooting

### Issue: Server fails to start

**Check:**
- `.env` file exists and is in project root
- No syntax errors in `.env`
- Required variables are set
- No example/placeholder values in production

### Issue: Gist sync not working

**Check:**
- `GIST_URL` or `GIST_ID` + `GITHUB_TOKEN` is set correctly
- `GIST_SYNC_INTERVAL` is not set to 0
- Token has `gist` scope
- Network connectivity to GitHub

### Issue: Authentication not working

**Check:**
- `API_KEYS` is set
- Using correct authentication method (Bearer token recommended)
- Key matches exactly (case-sensitive)
- Not using `/health` endpoint (always public)

## Related Documentation

- [Configuration Guide](CONFIGURATION.md) - Route configuration options
- [Security Guide](SECURITY.md) - Security best practices
- [Setup Guide](SETUP.md) - Interactive setup wizard
