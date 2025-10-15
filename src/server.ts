import Fastify from 'fastify'
import proxy from '@fastify/http-proxy'
import rateLimit from '@fastify/rate-limit'
import cors from '@fastify/cors'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import { fetchGistConfig, validateConfig, saveConfigToFile } from './utils/gist-config.js'
import { authMiddleware } from './utils/auth-middleware.js'
import type { RoutesConfig, RouteMapping } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ⚙️ Parse configuration options
const nodeEnv = process.env.NODE_ENV || 'development'
const bodyLimit = parseInt(process.env.BODY_LIMIT || '1048576', 10) // Default 1MB

// 📊 Logger configuration (optimized for production)
const fastify = Fastify({
  bodyLimit,
  logger: nodeEnv === 'production'
    ? {
        level: 'info'
        // Production: Use JSON format for better performance
      }
    : {
        // Development: Use pretty format
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      }
})

// 🌐 CORS configuration (optional)
const corsOrigins = process.env.CORS_ORIGINS
if (corsOrigins) {
  const origins = corsOrigins.split(',').map(o => o.trim())
  await fastify.register(cors, {
    origin: origins,
    credentials: true
  })
  fastify.log.info({ origins }, '🌐 CORS enabled')
} else {
  fastify.log.info('ℹ️  CORS not configured (CORS_ORIGINS not set)')
}

// 🚦 Rate limiting configuration (optional)
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
const rateLimitWindow = process.env.RATE_LIMIT_WINDOW || '1 minute'

await fastify.register(rateLimit, {
  max: rateLimitMax,
  timeWindow: rateLimitWindow,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
})
fastify.log.info({ max: rateLimitMax, window: rateLimitWindow }, '🚦 Rate limiting enabled')

// 🔒 Register authentication middleware (optional)
// If API_KEYS environment variable is set, all requests will require authentication
fastify.addHook('preHandler', authMiddleware)

const port = parseInt(process.env.PORT || '8080', 10)
const host = process.env.HOST || '0.0.0.0'

// Gist sync state
let currentConfigHash = ''
let syncTimer: NodeJS.Timeout | null = null // ✅ Store timer for cleanup

/**
 * Validates environment variables for security issues
 * Checks for example values, weak credentials, and proper token formats
 */
function validateEnvironment(): void {
  const token = process.env.GITHUB_TOKEN
  const apiKeys = process.env.API_KEYS

  // Validate GitHub Token
  if (token) {
    // Check token format
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      console.warn('⚠️  Warning: GITHUB_TOKEN format may be incorrect')
    }

    // Check for example/placeholder values
    if (token.includes('your-') || token === 'ghp_xxxxxxxxxxxxx' || token.includes('example')) {
      console.error('❌ Error: GITHUB_TOKEN is still using example value, please set a real token')
      process.exit(1)
    }
  }

  // Validate API Keys (if set)
  if (apiKeys) {
    const keys = apiKeys.split(',').map(k => k.trim())
    for (const key of keys) {
      if (key.length < 16) {
        console.warn(`⚠️  Warning: API key "${key.substring(0, 4)}..." is too short, recommend at least 16 characters`)
      }
      if (key.includes('example') || key === 'changeme' || key === 'your-secret-api-key') {
        console.error('❌ Error: API_KEYS contains example or insecure values')
        process.exit(1)
      }
    }
  }

  // Log security status
  if (apiKeys) {
    console.info('🔒 API authentication is enabled')
  } else {
    console.info('ℹ️  API authentication is disabled (no API_KEYS set)')
  }
}

/**
 * Initialize configuration (fetch from Gist if enabled)
 */
async function initializeConfig(): Promise<void> {
  const gistUrl = process.env.GIST_URL
  const gistId = process.env.GIST_ID

  if (!gistUrl && !gistId) {
    fastify.log.info('ℹ️  Gist sync not enabled, using local configuration')
    return
  }

  fastify.log.info('🔄 Gist sync enabled, initializing configuration...')

  const config = await fetchGistConfig(fastify.log)
  if (!config) {
    fastify.log.warn('⚠️  Failed to fetch configuration from Gist, using local configuration')
    return
  }

  if (!validateConfig(config)) {
    fastify.log.error('❌ Invalid Gist configuration format, using local configuration')
    return
  }

  // Save to local file
  saveConfigToFile(config, fastify.log)
  currentConfigHash = JSON.stringify(config)

  fastify.log.info('✅ Gist configuration initialized successfully')
}

/**
 * Start periodic Gist sync (detect changes and auto-restart)
 */
function startGistSync(): NodeJS.Timeout | null {
  const gistUrl = process.env.GIST_URL
  const gistId = process.env.GIST_ID

  if (!gistUrl && !gistId) {
    return null
  }

  const interval = parseInt(process.env.GIST_SYNC_INTERVAL || '300', 10) * 1000

  // If interval is 0, disable sync
  if (interval === 0) {
    fastify.log.info('ℹ️  Gist sync disabled (GIST_SYNC_INTERVAL=0)')
    return null
  }

  const autoRestart = process.env.GIST_AUTO_RESTART !== 'false' // Enabled by default

  fastify.log.info({
    intervalSeconds: interval / 1000,
    autoRestart
  }, '🔄 Starting Gist configuration sync')

  return setInterval(async () => {
    try {
      const config = await fetchGistConfig(fastify.log) // ✅ Fix: Pass logger
      if (!config || !validateConfig(config)) {
        return
      }

      const newConfigHash = JSON.stringify(config)

      // Check if configuration has changed
      if (newConfigHash !== currentConfigHash) {
        fastify.log.info('🔄 Gist configuration change detected!')

        // Save new configuration
        saveConfigToFile(config, fastify.log)
        currentConfigHash = newConfigHash

        if (autoRestart) {
          fastify.log.info('🔄 Configuration updated, triggering application restart...')
          // Graceful shutdown, Railway will auto-restart
          setTimeout(async () => {
            await fastify.close()
            process.exit(0)
          }, 1000)
        } else {
          fastify.log.warn('⚠️  Configuration updated but auto-restart not enabled, please restart application manually')
        }
      }
    } catch (error) {
      fastify.log.error({
        error: error instanceof Error ? error.message : String(error)
      }, '❌ Gist sync check failed')
    }
  }, interval)
}

function parseRoutes(): RouteMapping[] {
  // Read routes.json first
  const routesPath = resolve(__dirname, '../routes.json')
  const examplePath = resolve(__dirname, '../routes.example.json')

  // If routes.json doesn't exist but routes.example.json does, copy example file
  if (!existsSync(routesPath) && existsSync(examplePath)) {
    try {
      const exampleData = readFileSync(examplePath, 'utf-8')
      writeFileSync(routesPath, exampleData, 'utf-8')
      fastify.log.info('📋 First startup: Created initial configuration from routes.example.json')
    } catch (error) {
      fastify.log.warn({ error }, '⚠️  Failed to copy example configuration, using environment variables')
    }
  }

  if (existsSync(routesPath)) {
    try {
      const routesData = readFileSync(routesPath, 'utf-8')
      const config: RoutesConfig = JSON.parse(routesData)

      return config.routes.map(route => {
        const targetUrl = new URL(route.target)
        const upstream = `${targetUrl.protocol}//${targetUrl.host}`
        const rewrite = targetUrl.pathname === '/' ? '/' : targetUrl.pathname
        const cleanSource = route.source.endsWith('/*') ? route.source.slice(0, -2) : route.source

        return {
          source: cleanSource,
          target: route.target,
          upstream,
          rewrite,
          description: route.description,
          pathMode: route.pathMode || 'append',
          queryParamName: route.queryParamName || 'path',
          responseMode: route.responseMode || 'proxy',
          customResponse: route.customResponse
        }
      })
    } catch (error) {
      fastify.log.error({ error }, '❌ Failed to read routes.json')
      throw error
    }
  }

  // Legacy compatibility: use environment variables
  const routesEnv = process.env.PROXY_ROUTES
  if (routesEnv) {
    const routes = routesEnv.split(',').map(route => {
      const [source, targetPath] = route.trim().split('->').map(s => s.trim())
      const targetUrl = new URL(targetPath)
      const upstream = `${targetUrl.protocol}//${targetUrl.host}`
      const rewrite = targetUrl.pathname === '/' ? '/' : targetUrl.pathname
      const cleanSource = source.endsWith('/*') ? source.slice(0, -2) : source

      return {
        source: cleanSource,
        target: targetPath,
        upstream,
        rewrite,
        pathMode: 'append' as const,
        queryParamName: 'path',
        responseMode: 'proxy' as const
      }
    })

    return routes
  }

  // Last fallback: TARGET_URLS
  const targetUrls = (process.env.TARGET_URLS || 'https://example.com').split(',').map(url => url.trim())
  if (targetUrls.length === 1) {
    return [{
      source: '/',
      target: targetUrls[0],
      upstream: targetUrls[0],
      rewrite: '/',
      pathMode: 'append' as const,
      queryParamName: 'path',
      responseMode: 'proxy' as const
    }]
  }

  return targetUrls.map((url, i) => ({
    source: `/api${i + 1}`,
    target: url,
    upstream: url,
    rewrite: '/',
    pathMode: 'append' as const,
    queryParamName: 'path',
    responseMode: 'proxy' as const
  }))
}

// 🔒 Validate environment variables before startup
validateEnvironment()

// Initialize configuration (fetch from Gist if enabled)
await initializeConfig()

const routes = parseRoutes()

// Register routes
fastify.log.info('🎯 Route mappings:')
for (const route of routes) {
  if (route.pathMode === 'query') {
    // Query mode: Manually register route, use fetch for proxying
    fastify.all(`${route.source}/*`, async (request, reply) => {
      const [fullPath, existingQuery] = request.url.split('?')
      const wildcardPath = fullPath.replace(route.source, '')

      // Build query parameters
      const queryParams = new URLSearchParams()
      if (wildcardPath) {
        queryParams.set(route.queryParamName, wildcardPath)
      }
      if (existingQuery) {
        const existingParams = new URLSearchParams(existingQuery)
        existingParams.forEach((value, key) => {
          queryParams.set(key, value)
        })
      }

      const queryString = queryParams.toString()
      const targetPath = `${route.rewrite}${queryString ? '?' + queryString : ''}`
      const finalUrl = `${route.upstream}${targetPath}`

      fastify.log.info({
        method: request.method,
        from: request.url,
        to: finalUrl,
        mode: 'query',
        responseMode: route.responseMode,
        wildcardPath,
        queryParam: `${route.queryParamName}=${wildcardPath}`
      }, '📨 Forwarding request (Query mode)')

      // Prepare headers for forwarding (remove host)
      const forwardHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(request.headers)) {
        if (key.toLowerCase() !== 'host' && typeof value === 'string') {
          forwardHeaders[key] = value
        }
      }

      if (route.responseMode === 'custom' && route.customResponse) {
        // Custom mode: Respond immediately, forward asynchronously
        const customResp = route.customResponse

        // Set custom headers
        if (customResp.headers) {
          for (const [key, value] of Object.entries(customResp.headers)) {
            reply.header(key, value)
          }
        }

        // If Content-Type not set and body is object, set to application/json
        if (!customResp.headers?.['Content-Type'] && typeof customResp.body === 'object') {
          reply.header('Content-Type', 'application/json')
        }

        // Respond to client immediately
        reply.status(customResp.status)
        const responsePromise = reply.send(customResp.body)

        // Forward request to target asynchronously (Fire and Forget)
        ;(async () => {
          try {
            const startTime = Date.now()
            const response = await fetch(finalUrl, {
              method: request.method,
              headers: forwardHeaders,
              body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined
            })

            const responseTime = Date.now() - startTime
            const responseBody = await response.text()

            fastify.log.info({
              targetUrl: finalUrl,
              status: response.status,
              responseTime,
              responseBody: responseBody.substring(0, 500) // Limit length
            }, '✅ Target response (Custom mode - async)')
          } catch (error) {
            fastify.log.error({
              targetUrl: finalUrl,
              error: error instanceof Error ? error.message : String(error)
            }, '❌ Target request failed (Custom mode - async)')
          }
        })()

        return responsePromise
      } else {
        // Proxy mode: Wait for target response
        try {
          const response = await fetch(finalUrl, {
            method: request.method,
            headers: forwardHeaders,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined
          })

          // Copy response headers
          response.headers.forEach((value, key) => {
            reply.header(key, value)
          })

          // Set status code and return response content
          reply.status(response.status)
          return reply.send(await response.text())
        } catch (error) {
          fastify.log.error({ error, url: finalUrl }, '❌ Proxy request failed (Proxy mode)')
          reply.status(500)
          return reply.send({ error: 'Proxy request failed' })
        }
      }
    })

    const modeInfo = `[query: ${route.queryParamName}]`
    const logMessage = route.description
      ? `   ${route.source}/* → ${route.target} ${modeInfo} (${route.description})`
      : `   ${route.source}/* → ${route.target} ${modeInfo}`
    fastify.log.info(logMessage)
  } else {
    // Append mode: Use original approach
    const proxyOptions: any = {
      upstream: route.upstream,
      prefix: route.source,
      rewritePrefix: route.rewrite,
      http2: false,
      preHandler: async (request: any, _reply: any) => {
        const wildcardPath = request.url.replace(route.source, '')
        const finalUrl = `${route.upstream}${route.rewrite}${wildcardPath}`

        fastify.log.info({
          method: request.method,
          from: request.url,
          to: finalUrl,
          mode: 'append'
        }, '📨 Forwarding request (Append mode)')
      }
    }

    await fastify.register(proxy, proxyOptions)

    const modeInfo = '[append]'
    const logMessage = route.description
      ? `   ${route.source}/* → ${route.target} ${modeInfo} (${route.description})`
      : `   ${route.source}/* → ${route.target} ${modeInfo}`
    fastify.log.info(logMessage)
  }
}

// Health check endpoint
fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start server
try {
  await fastify.listen({ port, host })
  fastify.log.info(`🚀 Proxy server started successfully!`)
  fastify.log.info(`📍 Listening at: http://${host}:${port}`)

  // Start Gist sync (if enabled)
  syncTimer = startGistSync() // ✅ Store timer for cleanup
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

// ✅ Graceful shutdown with cleanup
const signals = ['SIGINT', 'SIGTERM'] as const
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal} signal, preparing to shutdown...`)

    // ✅ Clean up Gist sync timer
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
      fastify.log.info('🛑 Gist sync timer cleaned up')
    }

    await fastify.close()
    process.exit(0)
  })
}
