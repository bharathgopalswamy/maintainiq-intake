import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeWorkRequest,
  IntakeRequestError,
  messageForError,
} from "../services/intakeService.js";

function mockFetch({ status = 200, body = {}, headers = {}, invalidJson = false }) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: invalidJson ? () => Promise.reject(new SyntaxError("bad")) : () => Promise.resolve(body),
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeWorkRequest", () => {
  it("returns the analysis on success and sends the trimmed report", async () => {
    mockFetch({ body: { requestTitle: "AC issue" } });
    await expect(analyzeWorkRequest("  AC broken in Room 204  ")).resolves.toEqual({
      requestTitle: "AC issue",
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      description: "AC broken in Room 204",
    });
  });

  it("throws an IntakeRequestError with status and Retry-After on 429", async () => {
    mockFetch({
      status: 429,
      body: { message: "Too many analysis requests.", retryAfterSeconds: 30 },
      headers: { "Retry-After": "42" },
    });

    const error = await analyzeWorkRequest("AC broken in Room 204").catch((e) => e);
    expect(error).toBeInstanceOf(IntakeRequestError);
    expect(error.status).toBe(429);
    expect(error.retryAfterSeconds).toBe(42); // header wins over body
  });

  it("falls back to retryAfterSeconds in the body when the header is missing", async () => {
    mockFetch({ status: 429, body: { retryAfterSeconds: 30 } });
    const error = await analyzeWorkRequest("AC broken in Room 204").catch((e) => e);
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("keeps the status for other errors and has no retry time", async () => {
    mockFetch({ status: 502, body: { message: "Could not analyze." } });
    const error = await analyzeWorkRequest("AC broken in Room 204").catch((e) => e);
    expect(error.status).toBe(502);
    expect(error.message).toBe("Could not analyze.");
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it("reports an invalid response when the body is not JSON", async () => {
    mockFetch({ status: 500, invalidJson: true });
    await expect(analyzeWorkRequest("AC broken in Room 204")).rejects.toThrow(
      "The server returned an invalid response."
    );
  });
});

describe("messageForError", () => {
  it.each([
    [{ status: 429, retryAfterSeconds: 45 }, "Too many requests. Please wait 45 seconds and try again."],
    [{ status: 429, retryAfterSeconds: 1 }, "Too many requests. Please wait 1 second and try again."],
    [{ status: 429 }, "Too many requests. Please wait a moment and try again."],
    [{ status: 502 }, "The request could not be analyzed. Please try again."],
    [new Error("network down"), "The request could not be analyzed. Please try again."],
  ])("maps %j to a user-facing message", (error, expected) => {
    expect(messageForError(error)).toBe(expected);
  });
});
