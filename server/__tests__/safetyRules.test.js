import { describe, expect, it } from "vitest";
import { applySafetyRules, detectSafetyFlags } from "../safetyRules.js";

const baseResult = { safetyFlags: [], suggestedPriority: "Medium" };

describe("detectSafetyFlags", () => {
  it("flags a gas leak", () => {
    expect(detectSafetyFlags("Strong gas smell near the boiler room")).toContain(
      "Possible gas leak"
    );
  });

  it("is case-insensitive", () => {
    expect(detectSafetyFlags("SMOKE coming from the panel")).toContain(
      "Possible fire or smoke hazard"
    );
  });

  it("matches whole words only (firewall is not a fire)", () => {
    expect(detectSafetyFlags("The office firewall appliance keeps rebooting")).toEqual([]);
  });

  it("returns one flag per rule even if several keywords match", () => {
    const flags = detectSafetyFlags("Fire and smoke in the kitchen");
    expect(flags.filter((f) => f === "Possible fire or smoke hazard")).toHaveLength(1);
  });

  it("returns no flags for a routine request", () => {
    expect(detectSafetyFlags("Light bulb is out in room 204")).toEqual([]);
  });
});

describe("applySafetyRules", () => {
  it("escalates priority to Urgent Review when a hazard is found", () => {
    const result = applySafetyRules(baseResult, "Exposed wire hanging from ceiling");
    expect(result.suggestedPriority).toBe("Urgent Review");
    expect(result.safetyFlags).toContain("Possible electrical safety hazard");
  });

  it("keeps the AI priority when there is no hazard", () => {
    const result = applySafetyRules(baseResult, "Door hinge squeaks in room 12");
    expect(result.suggestedPriority).toBe("Medium");
  });

  it("does not duplicate a flag the AI already returned", () => {
    const result = applySafetyRules(
      { ...baseResult, safetyFlags: ["Possible gas leak"] },
      "gas leak in basement"
    );
    expect(result.safetyFlags).toEqual(["Possible gas leak"]);
  });
});
