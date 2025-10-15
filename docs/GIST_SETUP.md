# GitHub Gist Configuration Setup Guide

This guide will walk you through setting up GitHub Gist for dynamic route configuration in Fast Relay.

## Why Use GitHub Gist?

- ✅ **No redeployment needed** - Update routes without redeploying your app
- ✅ **Version control** - Automatic history of all configuration changes
- ✅ **Simple editing** - Edit directly in your browser on GitHub
- ✅ **Multi-instance sync** - Share configuration across multiple deployments
- ✅ **Free** - Both public and private Gists are free

## Table of Contents

1. [Quick Setup (Public Gist)](#quick-setup-public-gist)
2. [Secure Setup (Private Gist)](#secure-setup-private-gist)
3. [Railway Configuration](#railway-configuration)
4. [Testing Your Setup](#testing-your-setup)
5. [Troubleshooting](#troubleshooting)

---

## Quick Setup (Public Gist)

Best for: Non-sensitive configurations, demo projects, public APIs

### Step 1: Create a Gist

1. Navigate to https://gist.github.com/
2. Sign in to your GitHub account
3. Click "New gist" button

### Step 2: Add Your Configuration

1. Set filename to `routes.json`
2. Paste your route configuration:

```json
{
  "$schema": "./routes.schema.json",
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api",
      "pathMode": "append",
      "description": "Main API routes"
    }
  ]
}
```

3. Choose "Create secret gist" (recommended) or "Create public gist"

> **Note:** "Secret" gists are unlisted but not encrypted. Anyone with the URL can view them.

### Step 3: Get the Raw URL

1. Click the "Raw" button (top-right of the file content)
2. Copy the entire URL from your browser's address bar

   It should look like:
   ```
   https://gist.githubusercontent.com/username/abc123def456.../raw/routes.json
   ```

### Step 4: Configure Railway

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add the following variables:

   ```env
   GIST_URL=https://gist.githubusercontent.com/your-username/your-gist-id/raw/routes.json
   GIST_SYNC_INTERVAL=300
   GIST_AUTO_RESTART=true
   ```

4. Your app will automatically restart and load the configuration

### Step 5: Test the Configuration

1. Make a test request to your proxy:
   ```bash
   curl https://your-app.railway.app/api/v1/test
   ```

2. Check the logs to confirm configuration was loaded:
   ```
   [INFO] 🔄 Fetching config from Gist Raw URL
   [INFO] ✅ Gist config fetched successfully (Raw URL)
   [INFO] 💾 Configuration saved to local file
   ```

### Step 6: Update Your Configuration

1. Go back to your Gist on GitHub
2. Click "Edit" button
3. Make your changes
4. Click "Update secret gist"
5. Wait 5 minutes (or your configured interval)
6. Your app will automatically restart with the new configuration! ✨

---

## Secure Setup (Private Gist)

Best for: Production environments, sensitive URLs, internal services

### Step 1: Create a Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: e.g., "Fast Relay - Production"
4. Select expiration: Choose based on your security requirements
5. Select scopes: **Check only `gist`** (read and write gists)
6. Click "Generate token"
7. **IMPORTANT:** Copy the token immediately (it won't be shown again!)

   Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Create a Private Gist

1. Navigate to https://gist.github.com/
2. Create your `routes.json` file (same as public setup)
3. Choose "Create secret gist"
4. After creation, copy the Gist ID from the URL

   From: `https://gist.github.com/username/abc123def456...`

   Copy: `abc123def456...` (the part after your username)

### Step 3: Configure Railway (Private)

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add the following variables:

   ```env
   GIST_ID=your-gist-id
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GIST_SYNC_INTERVAL=300
   GIST_AUTO_RESTART=true
   ```

4. Your app will automatically restart

### Step 4: Verify Private Access

Check your logs for:
```
[INFO] 🔄 Fetching config from GitHub API
[INFO] ✅ Gist config fetched successfully (GitHub API)
```

---

## Railway Configuration

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GIST_URL` | ✅ (Public) | - | Raw URL of your public Gist |
| `GIST_ID` | ✅ (Private) | - | Gist ID for private Gists |
| `GITHUB_TOKEN` | ✅ (Private) | - | Personal Access Token (scope: gist) |
| `GIST_SYNC_INTERVAL` | ❌ | `300` | Sync interval in seconds (0 to disable) |
| `GIST_AUTO_RESTART` | ❌ | `true` | Auto-restart on config changes |

### Configuration Behavior

**When GIST_AUTO_RESTART=true (default):**
- App checks Gist every N seconds (default: 300 seconds / 5 minutes)
- If config changed → Saves new config → Gracefully shuts down
- Railway automatically restarts the app
- New configuration is loaded

**When GIST_AUTO_RESTART=false:**
- App checks Gist every N seconds
- If config changed → Saves new config → Logs warning
- Manual restart required for changes to take effect

### Multiple Instances

You can deploy multiple instances using the same Gist:

```
Instance A (Production)  ┐
Instance B (Staging)     ├─→ Same GIST_URL
Instance C (Development) ┘
```

All instances will sync to the same configuration automatically.

---

## Testing Your Setup

### 1. Verify Configuration Loading

Check your application logs:

```
[INFO] 🔄 Gist sync enabled, initializing configuration...
[INFO] 🔄 Fetching config from Gist Raw URL
[INFO] ✅ Gist config fetched successfully (Raw URL)
[INFO] 💾 Configuration saved to local file
[INFO] ✅ Gist configuration initialization complete
[INFO] 🎯 Route mappings:
[INFO]    /api/v1/* → https://users-api.example.com/api [append]
[INFO] 🚀 Proxy server started successfully!
[INFO] 🔄 Starting Gist configuration sync {"intervalSeconds":300,"autoRestart":true}
```

### 2. Test Route Forwarding

```bash
# Test an API route
curl https://your-app.railway.app/api/v1/test

# Check health endpoint
curl https://your-app.railway.app/health
```

### 3. Test Configuration Update

1. Edit your Gist on GitHub
2. Add a comment or change a route
3. Save the Gist
4. Watch your Railway logs:

```
[INFO] 🔄 Detected Gist configuration change!
[INFO] 💾 Configuration saved to local file
[INFO] 🔄 Configuration updated, triggering app restart...
```

5. After restart, verify new configuration is loaded

---

## Troubleshooting

### ❌ "Failed to fetch Gist config"

**Possible causes:**
- Invalid GIST_URL or GIST_ID
- Network connectivity issues
- Rate limiting (public Gists)

**Solutions:**
1. Verify your GIST_URL is a "Raw" URL
2. Check if Gist is accessible (try opening URL in browser)
3. For rate limiting, use private Gist with token

### ❌ "routes.json file not found in Gist"

**Cause:** The Gist doesn't contain a file named exactly `routes.json`

**Solution:**
1. Open your Gist on GitHub
2. Ensure the filename is exactly `routes.json` (case-sensitive)
3. If you renamed it, update the file and save

### ❌ "Invalid Gist configuration format"

**Cause:** JSON syntax error or invalid route configuration

**Solutions:**
1. Validate your JSON: https://jsonlint.com/
2. Check against the schema in `routes.schema.json`
3. Common issues:
   - Missing required fields (`source`, `target`)
   - Invalid `pathMode` value (must be "append" or "query")
   - Invalid `responseMode` value (must be "proxy" or "custom")
   - Missing `customResponse` when `responseMode: "custom"`

### ❌ "HTTP 401" or "HTTP 403" errors

**Cause:** Invalid or expired GitHub token

**Solutions:**
1. Verify your token has `gist` scope
2. Check if token has expired
3. Generate a new token and update `GITHUB_TOKEN`

### ⚠️ Configuration not updating

**Possible causes:**
1. `GIST_AUTO_RESTART=false` (requires manual restart)
2. Configuration hasn't changed (identical JSON)
3. Sync interval hasn't elapsed yet

**Solutions:**
1. Check `GIST_AUTO_RESTART` setting
2. Make a meaningful change to the configuration
3. Wait for the sync interval to complete
4. Check logs for sync attempts

### 🔍 Debugging

Enable detailed logging by checking Railway logs:

```bash
# View live logs
railway logs

# Or in Railway dashboard: Deployments → Your Deployment → Logs
```

Look for:
- Configuration fetch attempts
- Validation errors
- Sync interval logs
- Restart triggers

---

## Best Practices

### 1. Use Descriptive Names

```json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api",
      "description": "Production API v1 - All endpoints" ← Helpful!
    }
  ]
}
```

### 2. Test Changes Locally First

```bash
# Clone your Gist locally
git clone https://gist.github.com/username/gist-id.git

# Edit routes.json
vim routes.json

# Validate JSON
cat routes.json | jq .

# Push when ready
git add routes.json
git commit -m "Add new webhook route"
git push
```

### 3. Keep a Backup

```bash
# Download your current configuration
curl https://gist.githubusercontent.com/.../raw/routes.json > routes.backup.json
```

### 4. Use Version Control

Gist automatically tracks all changes. View history:
1. Open your Gist on GitHub
2. Click "Revisions" (top-right)
3. See all changes with timestamps

### 5. Set Reasonable Sync Intervals

```env
# Development: Fast updates
GIST_SYNC_INTERVAL=60

# Production: Balanced (default)
GIST_SYNC_INTERVAL=300

# Stable production: Slower updates (weekly changes)
GIST_SYNC_INTERVAL=1800
```

---

## Security Considerations

### Public Gists

- ✅ Use for: Non-sensitive configurations, demo projects
- ❌ Don't use for: Internal URLs, API keys, sensitive endpoints
- Note: "Secret" gists are simply unlisted, not encrypted

### Private Gists + Token

- ✅ Use for: Production, internal services, sensitive URLs
- ⚠️ Keep token secure: Store only in Railway environment variables
- 🔒 Token permissions: Grant only `gist` scope (no repository access)

### Railway Environment Variables

Railway environment variables are:
- ✅ Encrypted at rest
- ✅ Not visible in logs
- ✅ Accessible only to your project

---

## Advanced Configuration

### Multiple Environments

Use different Gists for different environments:

**Gist Structure:**
- `routes-production.json`
- `routes-staging.json`
- `routes-development.json`

**Railway Setup:**
```env
# Production
GIST_URL=https://gist.githubusercontent.com/.../routes-production.json

# Staging
GIST_URL=https://gist.githubusercontent.com/.../routes-staging.json
```

### Conditional Routes

Use Gist branching or multiple files:

```json
// routes-main.json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://users-api.example.com/api"
    }
  ]
}

// routes-beta.json
{
  "routes": [
    {
      "source": "/api/v1/*",
      "target": "https://beta-api.example.com/api"
    }
  ]
}
```

Switch by updating `GIST_URL` environment variable.

---

## Need Help?

- 📖 [Main Documentation](../README.md)
- 🐛 [Report an Issue](https://github.com/supra126/fast-relay/issues)
- 💡 [Request a Feature](https://github.com/supra126/fast-relay/issues)
- 📧 [Contact Support](mailto:supra126@gmail.com)

---

**Happy routing! 🚀**
