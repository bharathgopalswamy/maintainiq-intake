import { z } from "zod";

const confidenceValue = z.number().min(0).max(1);
export const workRequestSchema = z.object({
  requestTitle: z.string(),
  location: z.string(),

  assetCategory: z.enum([
    "HVAC",
    "Electrical",
    "Plumbing",
    "Mechanical",
    "Building",
    "Vertical Transportation",
    "Fire and Life Safety",
    "General",
  ]),

  asset: z.string(),
  problemType: z.string(),
  description: z.string(),

  suggestedPriority: z.enum([
    "Low",
    "Medium",
    "High",
    "Urgent Review",
    "Planner Review",
  ]),

  accessRestriction: z.string(),

  requiredSkill: z.enum([
    "HVAC Technician",
    "Electrician",
    "Plumber",
    "Mechanical Technician",
    "Elevator Technician",
    "Fire and Life Safety Technician",
    "General Maintenance Technician",
  ]),

  suggestedDuration: z.string(),
  safetyFlags: z.array(z.string()),
  missingFields: z.array(z.string()),

});

export const workRequestJsonSchema =
  z.toJSONSchema(workRequestSchema);

export function validateWorkRequest(result) {
  return workRequestSchema.parse(result);
}

