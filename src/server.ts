import Fastify from "fastify";
import proxy from "@fastify/http-proxy";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import formBody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import FormDataNode from "form-data";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import {
  fetchGistConfig,
  validateConfig,
  saveConfigToFile,
} from "./utils/gist-config.js";
import { authMiddleware } from "./utils/auth-middleware.js";
import type { RoutesConfig, RouteMapping } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ⚙️ Parse configuration options
const nodeEnv = process.env.NODE_ENV || "development";
const bodyLimit = parseInt(process.env.BODY_LIMIT || "10485760", 10); // Default 10MB

// 📊 Logger configuration (optimized for production)
const fastify = Fastify({
  bodyLimit,
  logger:
    nodeEnv === "production"
      ? {
          level: "info",
          // Production: Use JSON format for better performance
        }
      : {
          // Development: Use pretty format
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        },
});

// 🌐 CORS configuration (optional)
const corsOrigins = process.env.CORS_ORIGINS;
if (corsOrigins) {
  const origins = corsOrigins.split(",").map((o) => o.trim());
  await fastify.register(cors, {
    origin: origins,
    credentials: true,
  });
  fastify.log.info({ origins }, "🌐 CORS enabled");
} else {
  fastify.log.info("ℹ️  CORS not configured (CORS_ORIGINS not set)");
}

// 📦 Register form body parser (application/x-www-form-urlencoded)
await fastify.register(formBody);
fastify.log.info("📦 Form body parser registered");

// 📤 Register multipart parser (multipart/form-data)
await fastify.register(multipart, {
  limits: {
    fileSize: bodyLimit, // Use same limit as body
  },
});
fastify.log.info("📤 Multipart parser registered");

// 📝 Register custom parsers for text/* content types
const textContentTypes = [
  "text/plain",
  "text/html",
  "text/xml",
  "application/xml",
  "text/javascript",
  "application/javascript",
];

for (const contentType of textContentTypes) {
  fastify.addContentTypeParser(
    contentType,
    { parseAs: "string" },
    async (_request: any, payload: string) => {
      return payload;
    }
  );
}
fastify.log.info(
  { types: textContentTypes },
  "📝 Text content parsers registered"
);

// 🚦 Rate limiting configuration (optional)
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const rateLimitWindow = process.env.RATE_LIMIT_WINDOW || "1 minute";

await fastify.register(rateLimit, {
  max: rateLimitMax,
  timeWindow: rateLimitWindow,
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
  },
});
fastify.log.info(
  { max: rateLimitMax, window: rateLimitWindow },
  "🚦 Rate limiting enabled"
);

// 🔒 Register authentication middleware (optional)
// If API_KEYS environment variable is set, all requests will require authentication
fastify.addHook("preHandler", authMiddleware);

const port = parseInt(process.env.PORT || "8080", 10);
const host = process.env.HOST || "0.0.0.0";

// Gist sync state
let currentConfigHash = "";
let syncTimer: NodeJS.Timeout | null = null; // ✅ Store timer for cleanup

/**
 * Validates environment variables for security issues
 * Checks for example values, weak credentials, and proper token formats
 */
function validateEnvironment(): void {
  const token = process.env.GITHUB_TOKEN;
  const apiKeys = process.env.API_KEYS;

  // Validate GitHub Token
  if (token) {
    // Check token format
    if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
      console.warn("⚠️  Warning: GITHUB_TOKEN format may be incorrect");
    }

    // Check for example/placeholder values
    if (
      token.includes("your-") ||
      token === "ghp_xxxxxxxxxxxxx" ||
      token.includes("example")
    ) {
      console.error(
        "❌ Error: GITHUB_TOKEN is still using example value, please set a real token"
      );
      process.exit(1);
    }
  }

  // Validate API Keys (if set)
  if (apiKeys) {
    const keys = apiKeys.split(",").map((k) => k.trim());
    for (const key of keys) {
      if (key.length < 16) {
        console.warn(
          `⚠️  Warning: API key "${key.substring(
            0,
            4
          )}..." is too short, recommend at least 16 characters`
        );
      }
      if (
        key.includes("example") ||
        key === "changeme" ||
        key === "your-secret-api-key"
      ) {
        console.error("❌ Error: API_KEYS contains example or insecure values");
        process.exit(1);
      }
    }
  }

  // Log security status
  if (apiKeys) {
    console.info("🔒 API authentication is enabled");
  } else {
    console.info("ℹ️  API authentication is disabled (no API_KEYS set)");
  }
}

/**
 * Initialize configuration (fetch from Gist if enabled)
 */
async function initializeConfig(): Promise<void> {
  const gistUrl = process.env.GIST_URL;
  const gistId = process.env.GIST_ID;

  if (!gistUrl && !gistId) {
    fastify.log.info("ℹ️  Gist sync not enabled, using local configuration");
    return;
  }

  fastify.log.info("🔄 Gist sync enabled, initializing configuration...");

  const config = await fetchGistConfig(fastify.log);
  if (!config) {
    fastify.log.warn(
      "⚠️  Failed to fetch configuration from Gist, using local configuration"
    );
    return;
  }

  if (!validateConfig(config)) {
    fastify.log.error(
      "❌ Invalid Gist configuration format, using local configuration"
    );
    return;
  }

  // Save to local file
  saveConfigToFile(config, fastify.log);
  currentConfigHash = JSON.stringify(config);

  fastify.log.info("✅ Gist configuration initialized successfully");
}

/**
 * Start periodic Gist sync (detect changes and auto-restart)
 */
function startGistSync(): NodeJS.Timeout | null {
  const gistUrl = process.env.GIST_URL;
  const gistId = process.env.GIST_ID;

  if (!gistUrl && !gistId) {
    return null;
  }

  const interval = parseInt(process.env.GIST_SYNC_INTERVAL || "300", 10) * 1000;

  // If interval is 0, disable sync
  if (interval === 0) {
    fastify.log.info("ℹ️  Gist sync disabled (GIST_SYNC_INTERVAL=0)");
    return null;
  }

  const autoRestart = process.env.GIST_AUTO_RESTART !== "false"; // Enabled by default

  fastify.log.info(
    {
      intervalSeconds: interval / 1000,
      autoRestart,
    },
    "🔄 Starting Gist configuration sync"
  );

  return setInterval(async () => {
    try {
      const config = await fetchGistConfig(fastify.log); // ✅ Fix: Pass logger
      if (!config || !validateConfig(config)) {
        return;
      }

      const newConfigHash = JSON.stringify(config);

      // Check if configuration has changed
      if (newConfigHash !== currentConfigHash) {
        fastify.log.info("🔄 Gist configuration change detected!");

        // Save new configuration
        saveConfigToFile(config, fastify.log);
        currentConfigHash = newConfigHash;

        if (autoRestart) {
          fastify.log.info(
            "🔄 Configuration updated, triggering application restart..."
          );
          // Graceful shutdown, Railway will auto-restart
          setTimeout(async () => {
            await fastify.close();
            process.exit(0);
          }, 1000);
        } else {
          fastify.log.warn(
            "⚠️  Configuration updated but auto-restart not enabled, please restart application manually"
          );
        }
      }
    } catch (error) {
      fastify.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "❌ Gist sync check failed"
      );
    }
  }, interval);
}

/**
 * Serialize request body based on Content-Type
 * Supports JSON, form-urlencoded, multipart, and text formats
 */
async function serializeBody(
  body: any,
  contentType?: string,
  request?: any
): Promise<string | FormDataNode | undefined> {
  if (!body) {
    return undefined;
  }

  const ct = contentType?.toLowerCase() || "";

  // Handle multipart/form-data - reconstruct using form-data
  if (ct.includes("multipart/form-data") && request) {
    const formData = new FormDataNode();

    try {
      // Use request.parts() to read multipart data
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === "file") {
          // Handle file upload
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);

          // Append file with proper options
          formData.append(part.fieldname, fileBuffer, {
            filename: part.filename,
            contentType: part.mimetype
          });
        } else {
          // Handle regular field
          formData.append(part.fieldname, part.value as string);
        }
      }

      return formData;
    } catch (error) {
      // If parts() fails, body might already be parsed
      // Try to reconstruct from body object
      if (typeof body === "object") {
        for (const [key, value] of Object.entries(body)) {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
        return formData;
      }
    }
  }

  // Handle form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded")) {
    if (typeof body === "object") {
      return new URLSearchParams(body).toString();
    }
    return String(body);
  }

  // Handle JSON
  if (ct.includes("application/json")) {
    return JSON.stringify(body);
  }

  // Handle text formats (already strings)
  if (
    ct.includes("text/") ||
    ct.includes("application/xml") ||
    ct.includes("application/javascript")
  ) {
    return typeof body === "string" ? body : String(body);
  }

  // Default: treat as JSON for backwards compatibility
  return JSON.stringify(body);
}

function parseRoutes(): RouteMapping[] {
  // Read routes.json first
  const routesPath = resolve(__dirname, "../routes.json");
  const examplePath = resolve(__dirname, "../routes.example.json");

  // If routes.json doesn't exist but routes.example.json does, copy example file
  if (!existsSync(routesPath) && existsSync(examplePath)) {
    try {
      const exampleData = readFileSync(examplePath, "utf-8");
      writeFileSync(routesPath, exampleData, "utf-8");
      fastify.log.info(
        "📋 First startup: Created initial configuration from routes.example.json"
      );
    } catch (error) {
      fastify.log.warn(
        { error },
        "⚠️  Failed to copy example configuration, using environment variables"
      );
    }
  }

  if (existsSync(routesPath)) {
    try {
      const routesData = readFileSync(routesPath, "utf-8");
      const config: RoutesConfig = JSON.parse(routesData);

      return config.routes.map((route) => {
        const targetUrl = new URL(route.target);
        const upstream = `${targetUrl.protocol}//${targetUrl.host}`;
        const rewrite = targetUrl.pathname === "/" ? "/" : targetUrl.pathname;
        const cleanSource = route.source.endsWith("/*")
          ? route.source.slice(0, -2)
          : route.source;

        return {
          source: cleanSource,
          target: route.target,
          upstream,
          rewrite,
          description: route.description,
          pathMode: route.pathMode || "append",
          queryParamName: route.queryParamName || "path",
          responseMode: route.responseMode || "proxy",
          customResponse: route.customResponse,
        };
      });
    } catch (error) {
      fastify.log.error({ error }, "❌ Failed to read routes.json");
      throw error;
    }
  }

  // Legacy compatibility: use environment variables
  const routesEnv = process.env.PROXY_ROUTES;
  if (routesEnv) {
    const routes = routesEnv.split(",").map((route) => {
      const [source, targetPath] = route
        .trim()
        .split("->")
        .map((s) => s.trim());
      const targetUrl = new URL(targetPath);
      const upstream = `${targetUrl.protocol}//${targetUrl.host}`;
      const rewrite = targetUrl.pathname === "/" ? "/" : targetUrl.pathname;
      const cleanSource = source.endsWith("/*") ? source.slice(0, -2) : source;

      return {
        source: cleanSource,
        target: targetPath,
        upstream,
        rewrite,
        pathMode: "append" as const,
        queryParamName: "path",
        responseMode: "proxy" as const,
      };
    });

    return routes;
  }

  // Last fallback: TARGET_URLS
  const targetUrls = (process.env.TARGET_URLS || "https://example.com")
    .split(",")
    .map((url) => url.trim());
  if (targetUrls.length === 1) {
    return [
      {
        source: "/",
        target: targetUrls[0],
        upstream: targetUrls[0],
        rewrite: "/",
        pathMode: "append" as const,
        queryParamName: "path",
        responseMode: "proxy" as const,
      },
    ];
  }

  return targetUrls.map((url, i) => ({
    source: `/api${i + 1}`,
    target: url,
    upstream: url,
    rewrite: "/",
    pathMode: "append" as const,
    queryParamName: "path",
    responseMode: "proxy" as const,
  }));
}

// 🔒 Validate environment variables before startup
validateEnvironment();

// Initialize configuration (fetch from Gist if enabled)
await initializeConfig();

const routes = parseRoutes();

// Register routes
fastify.log.info("🎯 Route mappings:");
for (const route of routes) {
  if (route.pathMode === "query") {
    // Query mode: Create shared handler function
    const queryModeHandler = async (request: any, reply: any) => {
      const [fullPath, existingQuery] = request.url.split("?");
      const wildcardPath = fullPath.replace(route.source, "");

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (wildcardPath) {
        queryParams.set(route.queryParamName, wildcardPath);
      }
      if (existingQuery) {
        const existingParams = new URLSearchParams(existingQuery);
        existingParams.forEach((value, key) => {
          queryParams.set(key, value);
        });
      }

      const queryString = queryParams.toString();
      const targetPath = `${route.rewrite}${
        queryString ? "?" + queryString : ""
      }`;
      const finalUrl = `${route.upstream}${targetPath}`;

      fastify.log.info(
        {
          method: request.method,
          from: request.url,
          to: finalUrl,
          mode: "query",
          responseMode: route.responseMode,
          wildcardPath,
          queryParam: `${route.queryParamName}=${wildcardPath}`,
        },
        "📨 Forwarding request (Query mode)"
      );

      // Prepare headers for forwarding (remove host, content-length, and expect)
      const forwardHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        const lowerKey = key.toLowerCase();
        // Skip headers that fetch will handle or that are not supported
        if (
          lowerKey !== "host" &&
          lowerKey !== "content-length" &&
          lowerKey !== "expect" && // undici doesn't support Expect: 100-continue
          typeof value === "string"
        ) {
          forwardHeaders[key] = value;
        }
      }

      if (route.responseMode === "custom" && route.customResponse) {
        // Custom mode: Respond immediately, forward asynchronously
        const customResp = route.customResponse;

        // Set custom headers
        if (customResp.headers) {
          for (const [key, value] of Object.entries(customResp.headers)) {
            reply.header(key, value);
          }
        }

        // If Content-Type not set and body is object, set to application/json
        if (
          !customResp.headers?.["Content-Type"] &&
          typeof customResp.body === "object"
        ) {
          reply.header("Content-Type", "application/json");
        }

        // Respond to client immediately
        reply.status(customResp.status);
        const responsePromise = reply.send(customResp.body);

        // Forward request to target asynchronously (Fire and Forget)
        (async () => {
          try {
            const startTime = Date.now();
            const contentType = request.headers["content-type"]?.toLowerCase() || "";

            // Handle multipart/form-data specially
            let serializedBody: string | FormDataNode | undefined;

            if (
              contentType.includes("multipart/form-data") &&
              request.method !== "GET" &&
              request.method !== "HEAD"
            ) {
              // For multipart, we must process request.parts() directly
              const formData = new FormDataNode();

              try {
                const parts = request.parts();

                for await (const part of parts) {
                  if (part.type === "file") {
                    // Handle file upload
                    const chunks: Buffer[] = [];
                    for await (const chunk of part.file) {
                      chunks.push(chunk);
                    }
                    const fileBuffer = Buffer.concat(chunks);

                    formData.append(part.fieldname, fileBuffer, {
                      filename: part.filename,
                      contentType: part.mimetype
                    });
                  } else {
                    // Handle regular field
                    formData.append(part.fieldname, part.value as string);
                  }
                }

                serializedBody = formData;

                fastify.log.info({
                  isMultipart: true,
                  hasFormData: true
                }, '🔍 Multipart data processed');
              } catch (error) {
                fastify.log.error({
                  error: error instanceof Error ? error.message : String(error)
                }, '❌ Failed to process multipart data');
              }
            } else {
              // For non-multipart, use serializeBody
              serializedBody =
                request.method !== "GET" && request.method !== "HEAD"
                  ? await serializeBody(
                      request.body,
                      request.headers["content-type"],
                      request
                    )
                  : undefined;
            }

            // Ensure Content-Type header is set when body exists
            // For form-data, we need to convert to Buffer and set headers
            let finalBody: any = serializedBody;

            if (serializedBody instanceof FormDataNode) {
              const formHeaders = serializedBody.getHeaders();
              Object.assign(forwardHeaders, formHeaders);

              // Convert form-data stream to Buffer
              finalBody = await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];

                serializedBody.on('data', (chunk: any) => {
                  // Ensure chunk is Buffer (form-data emits strings by default)
                  const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                  chunks.push(bufferChunk);
                });

                serializedBody.on('end', () => {
                  const buffer = Buffer.concat(chunks);
                  resolve(buffer);
                });

                serializedBody.on('error', (err) => {
                  fastify.log.error({
                    error: err.message
                  }, '❌ FormData stream error');
                  reject(err);
                });

                // Manually trigger stream to start reading
                serializedBody.resume();
              });

              fastify.log.info({
                formDataSize: finalBody.length,
                contentType: formHeaders['content-type']
              }, '📦 Multipart form-data processed');
            } else if (serializedBody && request.headers["content-type"]) {
              forwardHeaders["content-type"] = request.headers["content-type"];
            }

            fastify.log.debug(
              {
                method: request.method,
                contentType: request.headers["content-type"],
                hasBody: !!finalBody,
                bodyType: finalBody?.constructor?.name,
                bodyLength:
                  typeof finalBody === "string"
                    ? finalBody.length
                    : finalBody instanceof Buffer
                    ? finalBody.length
                    : undefined,
                headers: forwardHeaders,
              },
              "🔍 Request details before forwarding"
            );

            const response = await fetch(finalUrl, {
              method: request.method,
              headers: forwardHeaders,
              body: finalBody,
            });

            const responseTime = Date.now() - startTime;
            const responseBody = await response.text();

            fastify.log.info(
              {
                targetUrl: finalUrl,
                status: response.status,
                responseTime,
                responseBody: responseBody.substring(0, 500), // Limit length
              },
              "✅ Target response (Custom mode - async)"
            );
          } catch (error) {
            fastify.log.error(
              {
                targetUrl: finalUrl,
                error: error instanceof Error ? error.message : String(error),
              },
              "❌ Target request failed (Custom mode - async)"
            );
            setTimeout(() => {
              console.error(error);
            }, 1000);
          }
        })();

        return responsePromise;
      } else {
        // Proxy mode: Wait for target response
        try {
          const contentType = request.headers["content-type"]?.toLowerCase() || "";

          // Handle multipart/form-data specially
          let serializedBody: string | FormDataNode | undefined;

          if (
            contentType.includes("multipart/form-data") &&
            request.method !== "GET" &&
            request.method !== "HEAD"
          ) {
            // For multipart, we must process request.parts() directly
            const formData = new FormDataNode();

            try {
              const parts = request.parts();

              for await (const part of parts) {
                if (part.type === "file") {
                  // Handle file upload
                  const chunks: Buffer[] = [];
                  for await (const chunk of part.file) {
                    chunks.push(chunk);
                  }
                  const fileBuffer = Buffer.concat(chunks);

                  formData.append(part.fieldname, fileBuffer, {
                    filename: part.filename,
                    contentType: part.mimetype
                  });
                } else {
                  // Handle regular field
                  formData.append(part.fieldname, part.value as string);
                }
              }

              serializedBody = formData;

              fastify.log.info({
                isMultipart: true,
                hasFormData: true
              }, '🔍 Multipart data processed (Proxy mode)');
            } catch (error) {
              fastify.log.error({
                error: error instanceof Error ? error.message : String(error)
              }, '❌ Failed to process multipart data (Proxy mode)');
            }
          } else {
            // For non-multipart, use serializeBody
            serializedBody =
              request.method !== "GET" && request.method !== "HEAD"
                ? await serializeBody(
                    request.body,
                    request.headers["content-type"],
                    request
                  )
                : undefined;
          }

          // Ensure Content-Type header is set when body exists
          // For form-data, we need to convert to Buffer and set headers
          let finalBody: any = serializedBody;

          if (serializedBody instanceof FormDataNode) {
            const formHeaders = serializedBody.getHeaders();
            Object.assign(forwardHeaders, formHeaders);

            // Convert form-data stream to Buffer
            finalBody = await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              serializedBody.on('data', (chunk: any) => {
                // Ensure chunk is Buffer
                const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                chunks.push(bufferChunk);
              });
              serializedBody.on('end', () => resolve(Buffer.concat(chunks)));
              serializedBody.on('error', reject);
              // Manually trigger stream to start reading
              serializedBody.resume();
            });
          } else if (serializedBody && request.headers["content-type"]) {
            forwardHeaders["content-type"] = request.headers["content-type"];
          }

          const response = await fetch(finalUrl, {
            method: request.method,
            headers: forwardHeaders,
            body: finalBody,
          });

          // Copy response headers
          response.headers.forEach((value, key) => {
            reply.header(key, value);
          });

          // Set status code and return response content
          reply.status(response.status);
          return reply.send(await response.text());
        } catch (error) {
          fastify.log.error(
            { error, url: finalUrl },
            "❌ Proxy request failed (Proxy mode)"
          );
          reply.status(500);
          return reply.send({ error: "Proxy request failed" });
        }
      }
    };

    // Register both routes: exact match and wildcard
    // 1. Exact match for /lafresh (without trailing slash)
    fastify.all(route.source, queryModeHandler);

    // 2. Wildcard match for /lafresh/* (with trailing slash and beyond)
    fastify.all(`${route.source}/*`, queryModeHandler);

    const modeInfo = `[query: ${route.queryParamName}]`;
    const logMessage = route.description
      ? `   ${route.source} & ${route.source}/* → ${route.target} ${modeInfo} (${route.description})`
      : `   ${route.source} & ${route.source}/* → ${route.target} ${modeInfo}`;
    fastify.log.info(logMessage);
  } else {
    // Append mode: Use original approach
    const proxyOptions: any = {
      upstream: route.upstream,
      prefix: route.source,
      rewritePrefix: route.rewrite,
      http2: false,
      preHandler: async (request: any, _reply: any) => {
        const wildcardPath = request.url.replace(route.source, "");
        const finalUrl = `${route.upstream}${route.rewrite}${wildcardPath}`;

        fastify.log.info(
          {
            method: request.method,
            from: request.url,
            to: finalUrl,
            mode: "append",
          },
          "📨 Forwarding request (Append mode)"
        );
      },
    };

    await fastify.register(proxy, proxyOptions);

    const modeInfo = "[append]";
    const logMessage = route.description
      ? `   ${route.source}/* → ${route.target} ${modeInfo} (${route.description})`
      : `   ${route.source}/* → ${route.target} ${modeInfo}`;
    fastify.log.info(logMessage);
  }
}

// Health check endpoint
fastify.get("/health", async (_request, _reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
try {
  await fastify.listen({ port, host });
  fastify.log.info(`🚀 Proxy server started successfully!`);
  fastify.log.info(`📍 Listening at: http://${host}:${port}`);

  // Start Gist sync (if enabled)
  syncTimer = startGistSync(); // ✅ Store timer for cleanup
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// ✅ Graceful shutdown with cleanup
const signals = ["SIGINT", "SIGTERM"] as const;
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal} signal, preparing to shutdown...`);

    // ✅ Clean up Gist sync timer
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
      fastify.log.info("🛑 Gist sync timer cleaned up");
    }

    await fastify.close();
    process.exit(0);
  });
}
