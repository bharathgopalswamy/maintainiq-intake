// Allowed values for the structured work request.
// Shared by the server (Zod schema) and the browser (review form dropdowns)
// so the two can never drift apart.

export const ASSET_CATEGORIES = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "Mechanical",
  "Building",
  "Vertical Transportation",
  "Fire and Life Safety",
  "General",
];

export const PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Urgent Review",
  "Planner Review",
];

export const REQUIRED_SKILLS = [
  "HVAC Technician",
  "Electrician",
  "Plumber",
  "Mechanical Technician",
  "Elevator Technician",
  "Fire and Life Safety Technician",
  "General Maintenance Technician",
];
