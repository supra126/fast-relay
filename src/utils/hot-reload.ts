import { RouteMapping } from '../types.js'

/**
 * Route Hot Reload Manager
 *
 * Since Fastify doesn't support dynamic route unloading, we use the following strategy:
 * 1. Route handlers dynamically read configuration from memory
 * 2. When config updates, only update the in-memory route mappings
 * 3. No need to re-register routes
 */
export class HotReloadManager {
  private routes: RouteMapping[] = []
  private lastReloadTime: Date | null = null

  /**
   * Gets current route configuration
   * @returns Array of route mappings
   */
  getRoutes(): RouteMapping[] {
    return this.routes
  }

  /**
   * Updates route configuration (hot reload)
   * @param newRoutes - New route mappings to apply
   * @param logger - Optional logger instance
   */
  updateRoutes(newRoutes: RouteMapping[], logger?: any): void {
    const oldCount = this.routes.length
    this.routes = newRoutes
    this.lastReloadTime = new Date()

    logger?.info({
      oldCount,
      newCount: newRoutes.length,
      timestamp: this.lastReloadTime.toISOString()
    }, '🔄 Route configuration updated (hot reload)')

    // Log new route mappings
    logger?.info('🎯 New route mappings:')
    for (const route of newRoutes) {
      const modeInfo = route.pathMode === 'query'
        ? `[query: ${route.queryParamName}]`
        : '[append]'

      const responseModeInfo = route.responseMode === 'custom'
        ? ' [custom response]'
        : ''

      const logMessage = route.description
        ? `   ${route.source}/* → ${route.target} ${modeInfo}${responseModeInfo} (${route.description})`
        : `   ${route.source}/* → ${route.target} ${modeInfo}${responseModeInfo}`

      logger?.info(logMessage)
    }
  }

  /**
   * Finds matching route for given path
   * @param path - Request path to match
   * @returns Matching RouteMapping or null if no match found
   */
  findMatchingRoute(path: string): RouteMapping | null {
    // Sort by source length, prioritize more specific paths
    const sortedRoutes = [...this.routes].sort(
      (a, b) => b.source.length - a.source.length
    )

    for (const route of sortedRoutes) {
      // Exact match
      if (path === route.source) {
        return route
      }

      // Wildcard match
      if (path.startsWith(route.source + '/') || path === route.source) {
        return route
      }
    }

    return null
  }

  /**
   * Gets last reload time
   * @returns Date of last reload or null if never reloaded
   */
  getLastReloadTime(): Date | null {
    return this.lastReloadTime
  }

  /**
   * Gets statistics information
   * @returns Object containing route statistics
   */
  getStats() {
    return {
      routeCount: this.routes.length,
      lastReloadTime: this.lastReloadTime?.toISOString() || null,
      routes: this.routes.map(r => ({
        source: r.source,
        target: r.target,
        pathMode: r.pathMode,
        responseMode: r.responseMode
      }))
    }
  }
}

// Global singleton instance
export const hotReloadManager = new HotReloadManager()
