import express from "express";
import path from "path";
import { analyzeWithGemini } from "./geminiService.js";
import { validateDescription } from "./validation.js";
import { createLogger, requestLogger } from "./logger.js";
import {
  createRateLimiter,
  readPositiveInt,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_WINDOW_MS,
} from "./rateLimiter.js";

/**
 * Reads the number of reverse proxies to trust from TRUST_PROXY.
 * Behind one proxy (Render, a load balancer) set TRUST_PROXY=1 so request.ip
 * is the real client from X-Forwarded-For; otherwise every user would share
 * the proxy's IP and one rate-limit bucket. Unset = trust no proxy.
 */
function readTrustProxy(value) {
  const hops = readPositiveInt(value, 0);
  return hops > 0 ? hops : false;
}

/**
 * Builds the Express app without starting it, so tests can call the
 * routes directly and swap the AI analyzer, logger and limits.
 */
export function createApp({
  analyze = analyzeWithGemini,
  isConfigured = () => Boolean(process.env.GEMINI_API_KEY),
  distDirectory = path.resolve(process.cwd(), "dist"),
  logger = createLogger(),
  rateLimit = {
    windowMs: readPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    max: readPositiveInt(process.env.RATE_LIMIT_MAX, DEFAULT_MAX_REQUESTS),
  },
  trustProxy = readTrustProxy(process.env.TRUST_PROXY),
} = {}) {
  const app = express();

  app.set("trust proxy", trustProxy);

  // Every API request gets an ID and one structured log line.
  app.use("/api", requestLogger({ logger }));

  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", (request, response) => {
    response.json({ status: "ok", geminiConfigured: isConfigured() });
  });

  // Only the analyze route is limited: it is the one that costs money
  // (each call uses the Gemini quota). The health check stays unlimited so
  // monitoring keeps working.
  const limitAnalyze = createRateLimiter({
    ...rateLimit,
    onLimited: (request, { retryAfterSeconds }) =>
      logger.warn({
        event: "rate_limit.exceeded",
        requestId: request.id,
        path: request.originalUrl.split("?")[0],
        retryAfterSeconds,
      }),
  });

  app.post("/api/intake/analyze", limitAnalyze, async (request, response) => {
    const validation = validateDescription(request.body?.description);

    if (!validation.ok) {
      return response.status(400).json({ message: validation.message });
    }

    if (!isConfigured()) {
      return response
        .status(503)
        .json({ message: "The analysis service is not configured." });
    }

    try {
      const result = await analyze(validation.description);
      return response.json(result);
    } catch (error) {
      // Log the error type and provider status only — never the message,
      // which could echo the report text or provider internals.
      logger.error({
        event: "analysis.failed",
        requestId: request.id,
        errorName: error?.name ?? "Error",
        errorStatus: typeof error?.status === "number" ? error.status : undefined,
      });

      if (error?.status === 429) {
        return response.status(429).json({
          message: "The analysis limit has been reached. Please try again later.",
        });
      }

      // Never send internal error details (stack traces, schema errors,
      // provider messages) to the browser.
      return response
        .status(502)
        .json({ message: "The request could not be analyzed. Please try again." });
    }
  });

  // Production frontend: Vite builds the React app into /dist.
  app.use(express.static(distDirectory));

  // React fallback: any non-API GET request receives index.html.
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api")) {
      return next();
    }

    return response.sendFile(path.join(distDirectory, "index.html"), (error) => {
      if (error) next(error);
    });
  });

  // Unknown API routes return JSON instead of an HTML error page.
  app.use("/api", (request, response) => {
    response.status(404).json({ message: "Not found." });
  });

  // Errors raised before a route runs — malformed JSON or a body over
  // 20 kB — return a short JSON message instead of Express's HTML error page.
  // eslint-disable-next-line no-unused-vars
  app.use((error, request, response, next) => {
    if (error?.type === "entity.parse.failed") {
      return response.status(400).json({ message: "The request body is not valid JSON." });
    }
    if (error?.type === "entity.too.large") {
      return response.status(413).json({ message: "The request is too large." });
    }
    if (error?.status === 404) {
      // e.g. index.html missing because the frontend was not built
      return response.status(404).json({ message: "Not found." });
    }

    logger.error({
      event: "request.failed",
      requestId: request.id,
      errorName: error?.name ?? "Error",
    });
    return response.status(500).json({ message: "Something went wrong." });
  });

  return app;
}
