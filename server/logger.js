import { randomUUID } from "crypto";

/**
 * Structured (JSON) logging with request IDs.
 *
 * Every log line is one JSON object, so a log service can filter by field
 * (e.g. all lines with status 502, or everything for one requestId) instead of
 * searching free text.
 *
 * Privacy rule: log lines describe *what happened* to a request — method,
 * path, status, duration, error type — never the maintenance report text,
 * request bodies, headers or API keys. Only allow-listed fields are written.
 */

const ALLOWED_FIELDS = new Set([
  "event",
  "requestId",
  "method",
  "path",
  "status",
  "durationMs",
  "errorName",
  "errorStatus",
  "retryAfterSeconds",
  "port",
]);

export function createLogger({
  write = (line) => process.stdout.write(`${line}\n`),
  now = () => new Date(),
} = {}) {
  function log(level, fields = {}) {
    const entry = { time: now().toISOString(), level };

    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_FIELDS.has(key) && value !== undefined) entry[key] = value;
    }

    write(JSON.stringify(entry));
  }

  return {
    info: (fields) => log("info", fields),
    warn: (fields) => log("warn", fields),
    error: (fields) => log("error", fields),
  };
}

/** A logger that discards everything (used by tests that don't check logs). */
export const silentLogger = createLogger({ write: () => {} });

// Accept a caller-supplied ID (e.g. from a load balancer) only if it is short
// and simple, so it cannot be used to inject text into the logs.
const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Express middleware: gives every request an ID, returns it in the
 * X-Request-Id response header, and writes one log line when the response
 * finishes.
 */
export function requestLogger({
  logger,
  generateId = randomUUID,
  clock = () => performance.now(),
} = {}) {
  return function logRequest(request, response, next) {
    const incoming = request.get("X-Request-Id");
    const requestId =
      incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : generateId();
    const startedAt = clock();

    request.id = requestId;
    response.set("X-Request-Id", requestId);

    response.on("finish", () => {
      const status = response.statusCode;
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      logger[level]({
        event: "request.completed",
        requestId,
        method: request.method,
        // originalUrl without the query string: queries could hold user input.
        path: request.originalUrl.split("?")[0],
        status,
        durationMs: Math.round(clock() - startedAt),
      });
    });

    next();
  };
}
