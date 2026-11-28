import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter, readPositiveInt } from "../rateLimiter.js";

// A tiny app with a controllable clock, so tests can move time forward
// instead of waiting a real minute.
function buildApp(options = {}) {
  let currentTime = 1_000_000;
  const clock = {
    now: () => currentTime,
    advance: (ms) => {
      currentTime += ms;
    },
  };
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, now: clock.now, ...options });
  const app = express();
  app.get("/limited", limiter, (req, res) => res.json({ ok: true }));
  return { app, clock, limiter };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit and reports remaining requests", async () => {
    const { app } = buildApp();

    const first = await request(app).get("/limited");
    expect(first.status).toBe(200);
    expect(first.headers["ratelimit-limit"]).toBe("3");
    expect(first.headers["ratelimit-remaining"]).toBe("2");
    expect(first.headers["ratelimit-reset"]).toBe("60");

    await request(app).get("/limited");
    const third = await request(app).get("/limited");
    expect(third.status).toBe(200);
    expect(third.headers["ratelimit-remaining"]).toBe("0");
  });

  it("returns 429 with Retry-After once the limit is exceeded", async () => {
    const { app, clock } = buildApp();
    for (let i = 0; i < 3; i += 1) await request(app).get("/limited");

    clock.advance(15_000);
    const blocked = await request(app).get("/limited");

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("45");
    expect(blocked.body).toEqual({
      message: "Too many analysis requests. Please wait and try again.",
      retryAfterSeconds: 45,
    });
  });

  it("resets the count when the window ends", async () => {
    const { app, clock } = buildApp();
    for (let i = 0; i < 4; i += 1) await request(app).get("/limited");

    clock.advance(60_000);
    const afterReset = await request(app).get("/limited");

    expect(afterReset.status).toBe(200);
    expect(afterReset.headers["ratelimit-remaining"]).toBe("2");
  });

  it("counts each client separately", async () => {
    let client = "203.0.113.1";
    const { app } = buildApp({ keyFor: () => client });
    for (let i = 0; i < 4; i += 1) await request(app).get("/limited");

    client = "203.0.113.2";
    const otherClient = await request(app).get("/limited");
    expect(otherClient.status).toBe(200);
  });

  it("never reports a Retry-After below one second", async () => {
    const { app, clock } = buildApp();
    for (let i = 0; i < 3; i += 1) await request(app).get("/limited");

    clock.advance(59_900);
    const blocked = await request(app).get("/limited");
    expect(blocked.headers["retry-after"]).toBe("1");
  });

  it("calls onLimited only for rejected requests", async () => {
    const onLimited = vi.fn();
    const { app } = buildApp({ onLimited });
    for (let i = 0; i < 5; i += 1) await request(app).get("/limited");

    expect(onLimited).toHaveBeenCalledTimes(2);
    expect(onLimited.mock.calls[0][1]).toEqual({ retryAfterSeconds: 60 });
  });

  it("drops expired windows so memory does not grow without limit", async () => {
    let client = 0;
    const { app, clock, limiter } = buildApp({ keyFor: () => `client-${client}` });

    for (client = 0; client < 1000; client += 1) await request(app).get("/limited");
    expect(limiter.trackedClients()).toBe(1000);

    clock.advance(60_000);
    client = 5000;
    await request(app).get("/limited");
    expect(limiter.trackedClients()).toBe(1);
  });
});

describe("readPositiveInt", () => {
  it.each([
    ["20", 20],
    [undefined, 7],
    ["", 7],
    ["0", 7],
    ["-5", 7],
    ["2.5", 7],
    ["ten", 7],
  ])("reads %j as %j", (value, expected) => {
    expect(readPositiveInt(value, 7)).toBe(expected);
  });
});
