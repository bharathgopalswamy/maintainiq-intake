import { describe, expect, it } from "vitest";
import { validateWorkRequest } from "../workRequestSchema.js";

const valid = {
  requestTitle: "Leaking pipe",
  location: "Room 101",
  assetCategory: "Plumbing",
  asset: "Sink",
  problemType: "Leak",
  description: "Water leaking under the sink in room 101",
  suggestedPriority: "Medium",
  accessRestriction: "",
  requiredSkill: "Plumber",
  suggestedDuration: "1 hour",
  safetyFlags: [],
  missingFields: [],
};

describe("validateWorkRequest", () => {
  it("accepts a well-formed work request", () => {
    expect(validateWorkRequest(valid)).toEqual(valid);
  });

  it("rejects an unknown asset category", () => {
    expect(() => validateWorkRequest({ ...valid, assetCategory: "Spaceship" })).toThrow();
  });

  it("rejects a missing required field", () => {
    const withoutLocation = { ...valid };
    delete withoutLocation.location;
    expect(() => validateWorkRequest(withoutLocation)).toThrow();
  });
});
