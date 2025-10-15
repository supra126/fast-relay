# Security Guide

Comprehensive security guide for Fast Relay deployments.

## Security Features

Fast Relay includes multiple layers of security:

- 🔒 **SSRF Protection** - Blocks requests to private IPs and cloud metadata services
- 🔑 **Optional API Authentication** - Protect endpoints with API keys
- 🎭 **Token Masking** - Automatically masks sensitive tokens in logs
- ✅ **Environment Validation** - Checks for weak credentials on startup
- 🌐 **Domain Whitelist** - Restrict allowed proxy targets
- ⚡ **Rate Limiting** - Protect against abuse and DDoS attacks
- 🔐 **CORS Control** - Manage cross-origin requests

## SSRF (Server-Side Request Forgery) Protection

### Automatic Protection

Fast Relay automatically blocks requests to:

**Private IP Ranges:**
- `10.0.0.0/8` (Class A private network)
- `172.16.0.0/12` (Class B private network)
- `192.168.0.0/16` (Class C private network)
- `127.0.0.0/8` (Loopback)
- `0.0.0.0/8` (Current network)

**Cloud Metadata Services:**
- `169.254.0.0/16` (Link-local, includes AWS metadata service at 169.254.169.254)

**Reserved Ranges:**
- `224.0.0.0/4` (Multicast)

**Blocked Hosts:**
- `localhost`
- `0.0.0.0`

### Allowed Protocols

Only these protocols are allowed:
- `http://`
- `https://`

**Blocked:** `file://`, `ftp://`, `gopher://`, etc.

### Domain Whitelist (Optional)

Add an extra layer of protection by restricting allowed domains:

```env
# Specific domains only
ALLOWED_DOMAINS=api.example.com,webhooks.example.com

# Wildcard subdomains
ALLOWED_DOMAINS=*.example.com,*.trusted-service.com

# Mixed configuration
ALLOWED_DOMAINS=api.example.com,*.internal-services.com,specific-partner.com
```

**Wildcard Rules:**
- `*.example.com` matches: `api.example.com`, `app.example.com`, `staging.example.com`
- `*.example.com` does NOT match: `example.com` (add both if needed)
- `*.*.example.com` is NOT supported (use `*.example.com` for all subdomains)

**Example Error:**
```json
{
  "error": "Domain validation failed",
  "message": "Target domain 'untrusted.com' is not in the allowed domains list"
}
```

## API Authentication

### Overview

API authentication is **optional** and disabled by default for development convenience.

**When to enable:**
- ✅ Production deployments
- ✅ Public-facing proxies
- ✅ When handling sensitive data
- ❌ Local development (optional)

### Configuration

Enable by setting `API_KEYS` in your `.env`:

```env
# Single key
API_KEYS=your-secure-random-key-here

# Multiple keys (different clients/services)
API_KEYS=web-client-key,mobile-app-key,internal-service-key,admin-key
```

### Authentication Methods

#### 1. Bearer Token (Recommended)

```bash
curl -H "Authorization: Bearer your-api-key" \
  https://your-proxy.com/api/users
```

**Advantages:**
- ✅ Industry standard
- ✅ Well-supported by frameworks
- ✅ Secure (header-based)

#### 2. X-API-Key Header

```bash
curl -H "X-API-Key: your-api-key" \
  https://your-proxy.com/api/users
```

**Use when:**
- Bearer token is not supported
- Custom header is preferred

#### 3. Query Parameter (Not Recommended)

```bash
curl https://your-proxy.com/api/users?api_key=your-api-key
```

**Warning:**
- ❌ Keys visible in URLs
- ❌ Logged in server access logs
- ❌ Cached by browsers/proxies
- ❌ Shared in browser history

**Only use for:**
- Quick testing
- Non-sensitive endpoints
- Legacy compatibility

### Public Endpoints

The `/health` endpoint is **always public** and does not require authentication:

```bash
curl https://your-proxy.com/health
# ✅ Works without API key
```

### Best Practices

**Key Generation:**
```bash
# Generate secure random key (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Key Management:**
- ✅ Use strong random keys (at least 16 characters)
- ✅ Use different keys for different clients
- ✅ Rotate keys periodically (every 90 days)
- ✅ Store keys in environment variables, never in code
- ✅ Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- ❌ Never commit keys to version control
- ❌ Never use example values in production
- ❌ Never share keys via email or chat

## Token Masking

### Automatic Masking

GitHub tokens and sensitive information are automatically masked in logs:

**Original:**
```env
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

**Logged as:**
```
token: "ghp_...wxyz"
```

### What Gets Masked

- GitHub Personal Access Tokens (`ghp_*`, `github_pat_*`)
- First characters shown: 4
- Last characters shown: 4
- Middle replaced with: `...`

**Example:**
```
ghp_1234567890abcdefghijklmnopqrst → ghp_...nopqrst
```

### Manual Masking

If you need to log sensitive data, use the masking utility:

```typescript
import { maskToken } from './utils/auth-middleware';

console.log(maskToken('secret-api-key-12345678'));
// Output: secr...5678
```

## Environment Validation

### Startup Validation

Fast Relay validates environment variables on startup to prevent common security mistakes.

**Checks performed:**
- ✅ GitHub token format (must start with `ghp_` or `github_pat_`)
- ✅ API key strength (warns if < 16 characters)
- ✅ Example/placeholder values
- ✅ Required variables present

**Example Values (Rejected in Production):**
- `your-*` (e.g., `your-api-key`)
- `example*` (e.g., `example-token`)
- `changeme`
- `your-secret-api-key`
- `test-key`
- `dev-key`

**Error Example:**
```
❌ Security Error: Using example/placeholder values in production
   - API_KEYS contains 'your-secure-api-key-here'
   - Please generate strong random keys

   Generate secure keys with:
   openssl rand -base64 32
```

### Development vs. Production

**Development (`NODE_ENV=development`):**
- ⚠️  Warnings only (doesn't fail)
- Allows short keys for testing
- Verbose error messages

**Production (`NODE_ENV=production`):**
- ❌ Fails startup on security issues
- Requires strong keys
- Strict validation

## Rate Limiting

### Configuration

Protect your proxy from abuse:

```env
# Allow 100 requests per minute per IP
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

### How It Works

- Tracks requests per IP address
- Returns `429 Too Many Requests` when limit exceeded
- Resets after the time window

**Response when rate limited:**
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 45 seconds"
}
```

### Recommendations

**By Use Case:**
```env
# Public API (strict)
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=1 minute

# Authenticated API (moderate)
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=1 minute

# Internal services (relaxed)
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute

# Webhook endpoints (very relaxed)
RATE_LIMIT_MAX=10000
RATE_LIMIT_WINDOW=1 hour
```

## CORS (Cross-Origin Resource Sharing)

### Configuration

Control which origins can access your proxy:

```env
# Single origin
CORS_ORIGINS=https://app.example.com

# Multiple origins
CORS_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com

# Development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

### Disabled by Default

If `CORS_ORIGINS` is not set, CORS is completely disabled:
- ✅ Simpler configuration
- ✅ No preflight requests
- ❌ Only works for same-origin or server-to-server

### When to Enable

Enable CORS when:
- Frontend app on different domain
- Mobile app making direct API calls
- Third-party integrations

## Security Checklist

### Pre-Deployment

- [ ] Generate strong random API keys
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_DOMAINS` whitelist
- [ ] Enable API authentication with `API_KEYS`
- [ ] Set appropriate rate limits
- [ ] Review all route targets for security
- [ ] Use private Gist with GitHub token (not public URL)
- [ ] Test authentication and authorization
- [ ] Verify SSRF protection
- [ ] Check logs for sensitive data leaks

### Post-Deployment

- [ ] Monitor rate limit metrics
- [ ] Set up alerts for security events
- [ ] Regularly rotate API keys
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Test failover scenarios
- [ ] Document security procedures
- [ ] Train team on security practices

### Ongoing Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Update GitHub tokens before expiration
- [ ] Review and update `ALLOWED_DOMAINS`
- [ ] Monitor for unusual traffic patterns
- [ ] Keep Fast Relay updated
- [ ] Audit route configurations
- [ ] Review security logs monthly

## Security Incident Response

### If API Key is Compromised

1. **Immediate:**
   - Remove compromised key from `API_KEYS`
   - Deploy updated configuration
   - Monitor for unauthorized access

2. **Short-term:**
   - Generate new keys
   - Update all clients
   - Review access logs

3. **Long-term:**
   - Implement key rotation policy
   - Add monitoring/alerts
   - Document incident

### If Token is Leaked

1. **Immediate:**
   - Revoke GitHub token at https://github.com/settings/tokens
   - Generate new token
   - Update `GITHUB_TOKEN` in `.env`
   - Redeploy

2. **Investigation:**
   - Check where token was exposed
   - Review Git history
   - Check logs and monitoring

3. **Prevention:**
   - Never commit `.env` to Git
   - Use secrets management
   - Implement pre-commit hooks

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
- [GitHub Token Security](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure)

## Related Documentation

- [Environment Variables](ENVIRONMENT.md) - Security-related environment variables
- [Configuration Guide](CONFIGURATION.md) - Route configuration security
- [Examples](EXAMPLES.md) - Secure configuration examples
