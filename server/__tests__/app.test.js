import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { createLogger, silentLogger } from "../logger.js";

const goodDescription = "The air conditioner in room 204 is blowing warm air.";

function buildApp(overrides = {}) {
  return createApp({
    analyze: vi.fn().mockResolvedValue({ requestTitle: "AC issue" }),
    isConfigured: () => true,
    logger: silentLogger,
    ...overrides,
  });
}

describe("GET /api/health", () => {
  it("reports status and configuration", async () => {
    const res = await request(buildApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", geminiConfigured: true });
  });
});

describe("POST /api/intake/analyze", () => {
  it("returns the analysis for a valid description", async () => {
    const analyze = vi.fn().mockResolvedValue({ requestTitle: "AC issue" });
    const res = await request(buildApp({ analyze }))
      .post("/api/intake/analyze")
      .send({ description: `  ${goodDescription}  ` });

    expect(res.status).toBe(200);
    expect(res.body.requestTitle).toBe("AC issue");
    expect(analyze).toHaveBeenCalledWith(goodDescription); // trimmed
  });

  it.each([
    [{}, "required"],
    [{ description: 42 }, "required"],
    [{ description: "too short" }, "more detailed"],
    [{ description: "x".repeat(1501) }, "under 1,500"],
  ])("rejects invalid input %#", async (body, expected) => {
    const res = await request(buildApp()).post("/api/intake/analyze").send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(expected);
  });

  it("returns 503 when the AI key is not configured", async () => {
    const res = await request(buildApp({ isConfigured: () => false }))
      .post("/api/intake/analyze")
      .send({ description: goodDescription });
    expect(res.status).toBe(503);
  });

  it("passes through rate-limit errors as 429", async () => {
    const analyze = vi.fn().mockRejectedValue(Object.assign(new Error("quota"), { status: 429 }));
    const res = await request(buildApp({ analyze }))
      .post("/api/intake/analyze")
      .send({ description: goodDescription });
    expect(res.status).toBe(429);
  });

  it("hides internal error details from the client", async () => {
    const analyze = vi.fn().mockRejectedValue(new Error("ZodError: secret internals"));
    const res = await request(buildApp({ analyze }))
      .post("/api/intake/analyze")
      .send({ description: goodDescription });
    expect(res.status).toBe(502);
    expect(res.body.message).not.toContain("secret internals");
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(buildApp()).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found." });
  });
});

describe("rate limiting on POST /api/intake/analyze", () => {
  const limitedApp = (overrides = {}) =>
    buildApp({ rateLimit: { windowMs: 60_000, max: 2 }, ...overrides });

  it("returns 429 with Retry-After after the configured number of requests", async () => {
    const analyze = vi.fn().mockResolvedValue({ requestTitle: "AC issue" });
    const app = limitedApp({ analyze });
    const send = () =>
      request(app).post("/api/intake/analyze").send({ description: goodDescription });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const blocked = await send();

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.body.retryAfterSeconds).toBe(Number(blocked.headers["retry-after"]));
    // The AI is never called for a rejected request, so no quota is used.
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it("also counts invalid requests, so bad input cannot be sent without limit", async () => {
    const app = limitedApp();
    for (let i = 0; i < 2; i += 1) {
      await request(app).post("/api/intake/analyze").send({ description: "short" });
    }
    const res = await request(app).post("/api/intake/analyze").send({ description: "short" });
    expect(res.status).toBe(429);
  });

  it("does not limit the health check", async () => {
    const app = limitedApp();
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    }
  });

  it("uses X-Forwarded-For as the client when TRUST_PROXY is set", async () => {
    const app = limitedApp({ trustProxy: 1 });
    const sendAs = (ip) =>
      request(app)
        .post("/api/intake/analyze")
        .set("X-Forwarded-For", ip)
        .send({ description: goodDescription });

    await sendAs("198.51.100.1");
    await sendAs("198.51.100.1");
    expect((await sendAs("198.51.100.1")).status).toBe(429);
    expect((await sendAs("198.51.100.2")).status).toBe(200);
  });

  it("ignores X-Forwarded-For when no proxy is trusted", async () => {
    const app = limitedApp({ trustProxy: false });
    const sendAs = (ip) =>
      request(app)
        .post("/api/intake/analyze")
        .set("X-Forwarded-For", ip)
        .send({ description: goodDescription });

    await sendAs("198.51.100.1");
    await sendAs("198.51.100.2");
    // A client cannot dodge the limit by inventing a new forwarded address.
    expect((await sendAs("198.51.100.3")).status).toBe(429);
  });
});

describe("structured logging", () => {
  function loggedApp(overrides = {}) {
    const lines = [];
    const logger = createLogger({ write: (line) => lines.push(JSON.parse(line)) });
    return { app: buildApp({ logger, ...overrides }), lines };
  }

  it("returns a request ID and logs the completed request", async () => {
    const { app, lines } = loggedApp();
    const res = await request(app)
      .post("/api/intake/analyze")
      .send({ description: goodDescription });

    const requestId = res.headers["x-request-id"];
    expect(requestId).toBeTruthy();
    expect(lines).toContainEqual(
      expect.objectContaining({
        event: "request.completed",
        requestId,
        method: "POST",
        path: "/api/intake/analyze",
        status: 200,
      })
    );
  });

  it("logs analysis failures by type without the report text or error message", async () => {
    const analyze = vi.fn().mockRejectedValue(
      Object.assign(new TypeError(`provider echoed: ${goodDescription}`), { status: 500 })
    );
    const { app, lines } = loggedApp({ analyze });
    const res = await request(app)
      .post("/api/intake/analyze")
      .send({ description: goodDescription });

    const failure = lines.find((line) => line.event === "analysis.failed");
    expect(failure).toMatchObject({
      level: "error",
      requestId: res.headers["x-request-id"],
      errorName: "TypeError",
      errorStatus: 500,
    });
    const allLogs = JSON.stringify(lines);
    expect(allLogs).not.toContain("air conditioner");
    expect(allLogs).not.toContain("provider echoed");
  });

  it("logs a warning when a client is rate limited", async () => {
    const { app, lines } = loggedApp({ rateLimit: { windowMs: 60_000, max: 1 } });
    await request(app).post("/api/intake/analyze").send({ description: goodDescription });
    await request(app).post("/api/intake/analyze").send({ description: goodDescription });

    expect(lines).toContainEqual(
      expect.objectContaining({ level: "warn", event: "rate_limit.exceeded" })
    );
    expect(lines).toContainEqual(
      expect.objectContaining({ event: "request.completed", status: 429, level: "warn" })
    );
  });
});

describe("request body errors", () => {
  it("returns JSON 400 for malformed JSON", async () => {
    const res = await request(buildApp())
      .post("/api/intake/analyze")
      .set("Content-Type", "application/json")
      .send('{"description": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "The request body is not valid JSON." });
  });

  it("returns JSON 413 for a body over 20 kB", async () => {
    const res = await request(buildApp())
      .post("/api/intake/analyze")
      .send({ description: "x".repeat(25_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ message: "The request is too large." });
  });
});
