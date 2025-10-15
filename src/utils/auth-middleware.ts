import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * API Keys authentication middleware (optional)
 *
 * If API_KEYS environment variable is set, this middleware will validate
 * incoming requests against the configured keys. If API_KEYS is not set,
 * all requests are allowed through without authentication.
 *
 * Supports single or multiple API keys (comma-separated):
 * - Single key: API_KEYS=your-secret-key
 * - Multiple keys: API_KEYS=key1,key2,key3
 *
 * Supports multiple authentication methods:
 * - Bearer Token in Authorization header (recommended)
 * - X-API-Key header
 * - api_key query parameter (legacy support, not recommended)
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 *
 * @example
 * ```typescript
 * // Single key
 * API_KEYS=your-secret-key
 *
 * // Multiple keys
 * API_KEYS=client1-key,client2-key,admin-key
 *
 * // In server setup
 * fastify.addHook('preHandler', authMiddleware)
 * ```
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Always allow health check endpoint
  if (request.url === '/health') {
    return
  }

  const apiKeysEnv = process.env.API_KEYS

  // If API_KEYS is not configured, skip authentication entirely
  if (!apiKeysEnv) {
    return
  }

  const apiKeys = apiKeysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0)

  // If no valid keys after parsing, skip authentication
  if (apiKeys.length === 0) {
    return
  }

  // Check multiple authentication methods
  const authHeader = request.headers.authorization
  const queryKey = (request.query as Record<string, any>)?.['api_key']
  const headerKey = request.headers['x-api-key']

  let providedKey: string | undefined

  // Method 1: Bearer Token (recommended)
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7)
  }
  // Method 2: X-API-Key Header
  else if (headerKey) {
    providedKey = Array.isArray(headerKey) ? headerKey[0] : headerKey
  }
  // Method 3: Query Parameter (legacy, not recommended)
  else if (queryKey) {
    providedKey = Array.isArray(queryKey) ? queryKey[0] : queryKey
  }

  // Validate against any of the configured keys
  if (!providedKey || !apiKeys.includes(providedKey)) {
    request.log.warn({
      ip: request.ip,
      url: request.url,
      method: request.method,
      hasKey: !!providedKey
    }, '🚫 Authentication failed')

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    })
  }
}
