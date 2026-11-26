import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const goodDescription = "The air conditioner in room 204 is blowing warm air.";

function buildApp(overrides = {}) {
  return createApp({
    analyze: vi.fn().mockResolvedValue({ requestTitle: "AC issue" }),
    isConfigured: () => true,
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
    vi.spyOn(console, "error").mockImplementation(() => {});
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
