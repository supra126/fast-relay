import { existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isUrlSafe } from './url-validator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Masks sensitive information for logging purposes
 * @param value - The sensitive value to mask
 * @returns Masked string safe for logging
 */
function maskSensitiveInfo(value: string | undefined): string {
  if (!value) return '[Not Set]'
  if (value.length <= 8) return '***'
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
}

interface GistFile {
  filename: string
  content: string
}

interface GistResponse {
  files: Record<string, GistFile>
}

export interface RoutesConfig {
  routes: Array<{
    source: string
    target: string
    description?: string
    pathMode?: 'append' | 'query'
    queryParamName?: string
    responseMode?: 'proxy' | 'custom'
    customResponse?: {
      status: number
      headers?: Record<string, string>
      body: any
    }
  }>
}

/**
 * Fetches route configuration from GitHub Gist with timeout support
 * @param logger - Optional logger instance for logging
 * @returns Promise resolving to RoutesConfig or null if fetch fails
 */
export async function fetchGistConfig(logger?: any): Promise<RoutesConfig | null> {
  // ⏱️ Configurable timeout (default 10 seconds)
  const timeout = parseInt(process.env.GIST_FETCH_TIMEOUT || '10000', 10)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Method 1: Use Raw URL (public Gist)
    if (process.env.GIST_URL) {
      // 🔒 Mask sensitive hash in URL for logging
      const safeUrl = process.env.GIST_URL.replace(
        /\/raw\/[a-f0-9]{40}\//,
        '/raw/[hash]/'
      )
      logger?.info({ url: safeUrl }, '🔄 Fetching config from Gist Raw URL')

      const response = await fetch(process.env.GIST_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'fast-relay'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const config = await response.json() as RoutesConfig
      logger?.info('✅ Gist config fetched successfully (Raw URL)')
      return config
    }

    // Method 2: Use GitHub API (private Gist)
    if (process.env.GIST_ID && process.env.GITHUB_TOKEN) {
      // 🔒 Only log masked token information
      logger?.info({
        gistId: process.env.GIST_ID,
        token: maskSensitiveInfo(process.env.GITHUB_TOKEN)
      }, '🔄 Fetching config from GitHub API')

      const response = await fetch(
        `https://api.github.com/gists/${process.env.GIST_ID}`,
        {
          signal: controller.signal,
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'fast-relay'
          }
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        // 🔒 Don't leak request details in error messages
        throw new Error(`GitHub API request failed (${response.status})`)
      }

      const gistData = await response.json() as GistResponse

      // Find routes.json file
      const routesFile = Object.values(gistData.files).find(
        file => file.filename === 'routes.json'
      )

      if (!routesFile) {
        throw new Error('routes.json file not found in Gist')
      }

      // ✅ Add JSON.parse error handling
      try {
        const config: RoutesConfig = JSON.parse(routesFile.content)
        logger?.info('✅ Gist config fetched successfully (GitHub API)')
        return config
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError)
        logger?.error({ error: errorMsg }, '❌ Invalid JSON format in Gist routes.json')
        throw new Error(`Invalid JSON format: ${errorMsg}`)
      }
    }

    clearTimeout(timeoutId)
    return null
  } catch (error) {
    clearTimeout(timeoutId)

    // ⏱️ Handle timeout errors
    if (error.name === 'AbortError') {
      logger?.error({ timeout: timeout }, '❌ Gist fetch timeout')
      return null
    }

    // 🔒 Sanitize error messages to prevent token leakage
    const errorMessage = error instanceof Error
      ? error.message.replace(/ghp_[a-zA-Z0-9]{36}/g, '[TOKEN]')
      : String(error)

    logger?.error({
      error: errorMessage
    }, '❌ Failed to fetch Gist config')
    return null
  }
}

/**
 * Validates route configuration format and security
 * @param config - Configuration object to validate
 * @returns true if configuration is valid, false otherwise
 */
export function validateConfig(config: RoutesConfig): boolean {
  if (!config || typeof config !== 'object') {
    return false
  }

  if (!Array.isArray(config.routes)) {
    return false
  }

  for (const route of config.routes) {
    if (!route.source || !route.target) {
      return false
    }
    if (typeof route.source !== 'string' || typeof route.target !== 'string') {
      return false
    }

    // 🔒 Validate target URL safety (prevent SSRF attacks)
    const urlCheck = isUrlSafe(route.target)
    if (!urlCheck.safe) {
      console.error(`[Security] Route ${route.source} has unsafe target URL: ${urlCheck.reason}`)
      return false
    }

    if (route.pathMode && !['append', 'query'].includes(route.pathMode)) {
      return false
    }
    if (route.responseMode && !['proxy', 'custom'].includes(route.responseMode)) {
      return false
    }
  }

  return true
}

/**
 * Saves configuration to local routes.json file
 * @param config - Configuration object to save
 * @param logger - Optional logger instance
 * @returns true if save successful, false otherwise
 */
export function saveConfigToFile(config: RoutesConfig, logger?: any): boolean {
  try {
    const routesPath = resolve(__dirname, '../../routes.json')
    const configJson = JSON.stringify(config, null, 2)

    writeFileSync(routesPath, configJson, 'utf-8')
    logger?.info({ path: routesPath }, '💾 Configuration saved to local file')
    return true
  } catch (error) {
    logger?.error({
      error: error instanceof Error ? error.message : String(error)
    }, '❌ Failed to save configuration')
    return false
  }
}
