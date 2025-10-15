import { existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
 * Fetches route configuration from GitHub Gist
 * @param logger - Optional logger instance for logging
 * @returns Promise resolving to RoutesConfig or null if fetch fails
 */
export async function fetchGistConfig(logger?: any): Promise<RoutesConfig | null> {
  try {
    // Method 1: Use Raw URL (public Gist)
    if (process.env.GIST_URL) {
      logger?.info({ url: process.env.GIST_URL }, '🔄 Fetching config from Gist Raw URL')

      const response = await fetch(process.env.GIST_URL, {
        headers: {
          'User-Agent': 'fast-relay'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const config = await response.json() as RoutesConfig
      logger?.info('✅ Gist config fetched successfully (Raw URL)')
      return config
    }

    // Method 2: Use GitHub API (private Gist)
    if (process.env.GIST_ID && process.env.GITHUB_TOKEN) {
      logger?.info({ gistId: process.env.GIST_ID }, '🔄 Fetching config from GitHub API')

      const response = await fetch(
        `https://api.github.com/gists/${process.env.GIST_ID}`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'fast-relay'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const gistData = await response.json() as GistResponse

      // Find routes.json file
      const routesFile = Object.values(gistData.files).find(
        file => file.filename === 'routes.json'
      )

      if (!routesFile) {
        throw new Error('routes.json file not found in Gist')
      }

      const config: RoutesConfig = JSON.parse(routesFile.content)
      logger?.info('✅ Gist config fetched successfully (GitHub API)')
      return config
    }

    return null
  } catch (error) {
    logger?.error({
      error: error instanceof Error ? error.message : String(error)
    }, '❌ Failed to fetch Gist config')
    return null
  }
}

/**
 * Validates route configuration format
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

/**
 * Starts periodic Gist configuration sync
 * @param onConfigUpdate - Callback function called when config is updated
 * @param logger - Optional logger instance
 * @returns Interval timer or null if Gist sync is not configured
 */
export function startGistSync(
  onConfigUpdate: (config: RoutesConfig) => void,
  logger?: any
): NodeJS.Timeout | null {
  const gistUrl = process.env.GIST_URL
  const gistId = process.env.GIST_ID

  if (!gistUrl && !gistId) {
    return null
  }

  const interval = parseInt(process.env.GIST_SYNC_INTERVAL || '30', 10) * 1000
  logger?.info({ intervalSeconds: interval / 1000 }, '🔄 Starting Gist configuration sync')

  // Execute immediately once
  fetchAndApplyConfig(onConfigUpdate, logger)

  // Periodic sync
  return setInterval(() => {
    fetchAndApplyConfig(onConfigUpdate, logger)
  }, interval)
}

/**
 * Fetches and applies configuration from Gist
 * @param onConfigUpdate - Callback function called when config is updated
 * @param logger - Optional logger instance
 */
async function fetchAndApplyConfig(
  onConfigUpdate: (config: RoutesConfig) => void,
  logger?: any
): Promise<void> {
  const config = await fetchGistConfig(logger)

  if (!config) {
    return
  }

  if (!validateConfig(config)) {
    logger?.error('❌ Invalid Gist configuration format')
    return
  }

  // Save to local file
  saveConfigToFile(config, logger)

  // Trigger update callback
  onConfigUpdate(config)
}
