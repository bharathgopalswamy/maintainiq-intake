/**
 * Fixed-window rate limiter for Express, kept in memory.
 *
 * Each client key (the caller's IP address by default) gets `max` requests per
 * `windowMs`. The window starts with the client's first request; when it ends,
 * the count resets. Requests over the limit receive 429 Too Many Requests with
 * a Retry-After header, so the client knows how long to wait.
 *
 * Why in memory: the app runs as a single instance and has no database. With
 * several instances each would count separately, so a shared store (e.g.
 * Redis) would be needed — see docs/ARCHITECTURE.md.
 */

export const DEFAULT_WINDOW_MS = 60_000;
export const DEFAULT_MAX_REQUESTS = 10;

/** Reads a positive integer from an environment variable, or uses the fallback. */
export function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX_REQUESTS,
  now = () => Date.now(),
  keyFor = (request) => request.ip ?? "unknown",
  onLimited = () => {},
  message = "Too many analysis requests. Please wait and try again.",
} = {}) {
  // key -> { count, resetAt }
  const clients = new Map();

  // Remove finished windows so the map does not grow without limit.
  function removeExpired(currentTime) {
    for (const [key, entry] of clients) {
      if (entry.resetAt <= currentTime) clients.delete(key);
    }
  }

  function rateLimit(request, response, next) {
    const currentTime = now();
    const key = keyFor(request);
    let entry = clients.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      if (clients.size >= 1000) removeExpired(currentTime);
      entry = { count: 0, resetAt: currentTime + windowMs };
      clients.set(key, entry);
    }

    entry.count += 1;

    const secondsUntilReset = Math.max(
      1,
      Math.ceil((entry.resetAt - currentTime) / 1000)
    );
    const remaining = Math.max(0, max - entry.count);

    // Informational headers (IETF draft "RateLimit header fields").
    response.set("RateLimit-Limit", String(max));
    response.set("RateLimit-Remaining", String(remaining));
    response.set("RateLimit-Reset", String(secondsUntilReset));

    if (entry.count > max) {
      response.set("Retry-After", String(secondsUntilReset));
      onLimited(request, { retryAfterSeconds: secondsUntilReset });
      return response.status(429).json({
        message,
        retryAfterSeconds: secondsUntilReset,
      });
    }

    return next();
  }

  // Exposed for tests and diagnostics only.
  rateLimit.trackedClients = () => clients.size;

  return rateLimit;
}
