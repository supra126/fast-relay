/**
 * Custom response configuration interface
 */
export interface CustomResponse {
  status: number
  headers?: Record<string, string>
  body: any
}

/**
 * Route configuration interface (loaded from routes.json)
 */
export interface RouteConfig {
  source: string
  target: string
  description?: string
  pathMode?: 'append' | 'query'
  queryParamName?: string
  responseMode?: 'proxy' | 'custom'
  customResponse?: CustomResponse
}

/**
 * Routes configuration file interface
 */
export interface RoutesConfig {
  routes: RouteConfig[]
}

/**
 * Internal route mapping interface
 * Parsed and transformed from RouteConfig for internal use
 */
export interface RouteMapping {
  source: string
  target: string
  upstream: string
  rewrite: string
  description?: string
  pathMode: 'append' | 'query'
  queryParamName: string
  responseMode: 'proxy' | 'custom'
  customResponse?: CustomResponse
}
