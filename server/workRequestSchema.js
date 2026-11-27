import { z } from "zod";
import {
  ASSET_CATEGORIES,
  PRIORITIES,
  REQUIRED_SKILLS,
} from "../shared/workRequestOptions.js";

export const workRequestSchema = z.object({
  requestTitle: z.string(),
  location: z.string(),

  assetCategory: z.enum(ASSET_CATEGORIES),

  asset: z.string(),
  problemType: z.string(),
  description: z.string(),

  suggestedPriority: z.enum(PRIORITIES),

  accessRestriction: z.string(),

  requiredSkill: z.enum(REQUIRED_SKILLS),

  suggestedDuration: z.string(),
  safetyFlags: z.array(z.string()),
  missingFields: z.array(z.string()),
});

export const workRequestJsonSchema =
  z.toJSONSchema(workRequestSchema);

export function validateWorkRequest(result) {
  return workRequestSchema.parse(result);
}

