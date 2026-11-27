import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createLogger, requestLogger } from "../logger.js";

function captureLogger() {
  const lines = [];
  const logger = createLogger({
    write: (line) => lines.push(JSON.parse(line)),
    now: () => new Date("2026-11-27T12:00:00.000Z"),
  });
  return { logger, lines };
}

describe("createLogger", () => {
  it("writes one JSON object per line with time and level", () => {
    const raw = [];
    const logger = createLogger({
      write: (line) => raw.push(line),
      now: () => new Date("2026-11-27T12:00:00.000Z"),
    });

    logger.info({ event: "server.started", port: 3001 });

    expect(raw).toHaveLength(1);
    expect(JSON.parse(raw[0])).toEqual({
      time: "2026-11-27T12:00:00.000Z",
      level: "info",
      event: "server.started",
      port: 3001,
    });
  });

  it("drops any field that is not on the allow-list", () => {
    const { logger, lines } = captureLogger();

    logger.error({
      event: "analysis.failed",
      description: "Oil leak under the motor in Room 204",
      apiKey: "secret-key",
      errorName: "ZodError",
    });

    expect(lines[0]).toEqual({
      time: "2026-11-27T12:00:00.000Z",
      level: "error",
      event: "analysis.failed",
      errorName: "ZodError",
    });
  });
});

describe("requestLogger", () => {
  function buildApp({ generateId = () => "generated-id-0001" } = {}) {
    const { logger, lines } = captureLogger();
    let tick = 0;
    const app = express();
    app.use(requestLogger({ logger, generateId, clock: () => (tick += 25) }));
    app.get("/ok", (req, res) => res.json({ id: req.id }));
    app.get("/missing", (req, res) => res.status(404).json({}));
    app.get("/broken", (req, res) => res.status(502).json({}));
    return { app, lines };
  }

  it("assigns a request ID, returns it in a header and exposes it on the request", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/ok");

    expect(res.headers["x-request-id"]).toBe("generated-id-0001");
    expect(res.body.id).toBe("generated-id-0001");
  });

  it("logs method, path without query string, status and duration", async () => {
    const { app, lines } = buildApp();
    await request(app).get("/ok?description=private+text");

    expect(lines).toEqual([
      {
        time: "2026-11-27T12:00:00.000Z",
        level: "info",
        event: "request.completed",
        requestId: "generated-id-0001",
        method: "GET",
        path: "/ok",
        status: 200,
        durationMs: 25,
      },
    ]);
  });

  it.each([
    ["/missing", "warn"],
    ["/broken", "error"],
  ])("logs %s at level %s", async (path, level) => {
    const { app, lines } = buildApp();
    await request(app).get(path);
    expect(lines[0].level).toBe(level);
  });

  it("reuses a safe incoming X-Request-Id", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/ok").set("X-Request-Id", "lb-1234-abcd");
    expect(res.headers["x-request-id"]).toBe("lb-1234-abcd");
  });

  it("replaces an unsafe incoming X-Request-Id", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get("/ok")
      .set("X-Request-Id", 'abc"} {"level":"info","event":"fake');
    expect(res.headers["x-request-id"]).toBe("generated-id-0001");
  });

  it("generates a UUID by default", async () => {
    const { logger } = captureLogger();
    const app = express();
    app.use(requestLogger({ logger }));
    app.get("/ok", (req, res) => res.json({}));

    const res = await request(app).get("/ok");
    expect(res.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
