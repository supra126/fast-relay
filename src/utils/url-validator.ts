import { URL } from 'url'

/**
 * Dangerous IP ranges that should be blocked to prevent SSRF attacks
 */
const BLOCKED_IP_RANGES = [
  /^127\./,           // localhost
  /^10\./,            // Private network (Class A)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network (Class B)
  /^192\.168\./,      // Private network (Class C)
  /^169\.254\./,      // Link-local (AWS metadata service)
  /^0\./,             // Reserved
  /^224\./,           // Multicast
  /^255\./,           // Broadcast
]

/**
 * Blocked URL schemes that could be exploited
 */
const BLOCKED_SCHEMES = ['file', 'ftp', 'gopher', 'data', 'dict', 'ssh', 'telnet']

/**
 * Result of URL safety validation
 */
export interface UrlSafetyResult {
  safe: boolean
  reason?: string
}

/**
 * Validates if a URL is safe to use as a proxy target (prevents SSRF attacks)
 *
 * @param urlString - The URL string to validate
 * @returns Object indicating if URL is safe and reason if not
 *
 * @example
 * ```typescript
 * const result = isUrlSafe('http://example.com/api')
 * if (!result.safe) {
 *   console.error(`Unsafe URL: ${result.reason}`)
 * }
 * ```
 */
export function isUrlSafe(urlString: string): UrlSafetyResult {
  try {
    const url = new URL(urlString)

    // 1. Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: `Protocol not allowed: ${url.protocol}` }
    }

    // 2. Check for blocked schemes (extra safety check)
    const scheme = url.protocol.replace(':', '')
    if (BLOCKED_SCHEMES.includes(scheme)) {
      return { safe: false, reason: `Blocked protocol: ${url.protocol}` }
    }

    // 3. Check hostname
    const hostname = url.hostname.toLowerCase()

    // Block localhost references
    if (['localhost', '0.0.0.0', '[::]', '[::1]'].includes(hostname)) {
      return { safe: false, reason: 'Access to localhost is not allowed' }
    }

    // 4. Check IP address ranges
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: `IP address in blocked range: ${hostname}` }
      }
    }

    // 5. Optional: Domain whitelist (recommended for production)
    if (process.env.ALLOWED_DOMAINS) {
      const allowedDomains = process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
      const isAllowed = allowedDomains.some(domain => {
        if (domain.startsWith('*.')) {
          // Support wildcard subdomains
          const baseDomain = domain.slice(2)
          return hostname.endsWith(baseDomain)
        }
        return hostname === domain
      })

      if (!isAllowed) {
        return { safe: false, reason: `Domain not in whitelist: ${hostname}` }
      }
    }

    return { safe: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { safe: false, reason: `Invalid URL format: ${errorMessage}` }
  }
}
