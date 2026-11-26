import { describe, expect, it } from "vitest";
import { parseGeminiJson } from "../geminiService.js";

describe("parseGeminiJson", () => {
  it("parses plain JSON", () => {
    expect(parseGeminiJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips Markdown code fences", () => {
    expect(parseGeminiJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores text around the JSON object", () => {
    expect(parseGeminiJson('Here you go: {"a":1} Thanks!')).toEqual({ a: 1 });
  });

  it("throws on an empty response", () => {
    expect(() => parseGeminiJson("")).toThrow("empty response");
  });

  it("throws when there is no JSON object", () => {
    expect(() => parseGeminiJson("no json here")).toThrow("did not return a JSON object");
  });
});
