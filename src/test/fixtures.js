// Fictional analysis result, shaped like the API response.
export function makeAnalysis(overrides = {}) {
  return {
    requestTitle: "Conveyor stopped with oil leak",
    location: "Packaging Line 2",
    assetCategory: "Mechanical",
    asset: "Conveyor motor",
    problemType: "Equipment stoppage and oil leak",
    description: "Conveyor stopped; oil beneath the motor near the sealing station.",
    suggestedPriority: "High",
    accessRestriction: "Area restricted by line supervisor",
    requiredSkill: "Mechanical Technician",
    suggestedDuration: "Planner confirmation required",
    safetyFlags: [],
    missingFields: [],
    ...overrides,
  };
}

export function makePayload(overrides = {}) {
  return {
    requestId: "WR-12345678",
    status: "Verified",
    source: "MaintainIQ Work Request Intake",
    createdAt: "2026-11-26T15:00:00.000Z",
    humanVerified: true,
    humanEditedFields: ["location"],
    workOrder: {
      requestTitle: "Conveyor stopped with oil leak",
      location: "Packaging Line 2",
      assetCategory: "Mechanical",
      asset: "Conveyor motor",
      problemType: "Equipment stoppage and oil leak",
      description: "Conveyor stopped; oil beneath the motor.",
      priority: "High",
      accessRestriction: "Area restricted",
      requiredSkill: "Mechanical Technician",
      estimatedDuration: "Planner confirmation required",
      safetyFlags: [],
    },
    ...overrides,
  };
}
