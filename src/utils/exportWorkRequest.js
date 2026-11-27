// Turns a human-verified work request into files another system can import:
// JSON (for an API integration) and CSV (for a spreadsheet or a CMMS bulk
// import screen). Pure functions, so they are easy to unit test.

// Column order of the CSV export. Each column reads one value from the payload.
export const CSV_COLUMNS = [
  { header: "Request ID", value: (p) => p.requestId },
  { header: "Status", value: (p) => p.status },
  { header: "Created At", value: (p) => p.createdAt },
  { header: "Human Verified", value: (p) => (p.humanVerified ? "Yes" : "No") },
  { header: "Edited Fields", value: (p) => p.humanEditedFields },
  { header: "Request Title", value: (p) => p.workOrder.requestTitle },
  { header: "Location", value: (p) => p.workOrder.location },
  { header: "Asset Category", value: (p) => p.workOrder.assetCategory },
  { header: "Asset", value: (p) => p.workOrder.asset },
  { header: "Problem Type", value: (p) => p.workOrder.problemType },
  { header: "Priority", value: (p) => p.workOrder.priority },
  { header: "Required Skill", value: (p) => p.workOrder.requiredSkill },
  { header: "Estimated Duration", value: (p) => p.workOrder.estimatedDuration },
  { header: "Access Restriction", value: (p) => p.workOrder.accessRestriction },
  { header: "Safety Flags", value: (p) => p.workOrder.safetyFlags },
  { header: "Description", value: (p) => p.workOrder.description },
  { header: "Source", value: (p) => p.source },
];

// Spreadsheet programs run a cell as a formula if it starts with one of
// these characters ("CSV injection"). Text typed by a user must never do that.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Converts one value into a safe CSV cell (RFC 4180 quoting).
 * - Lists become "a; b; c"
 * - Missing values become an empty cell
 * - Values that look like formulas are prefixed with an apostrophe
 * - Cells containing commas, quotes or line breaks are wrapped in quotes,
 *   and inner quotes are doubled
 */
export function toCsvCell(value) {
  if (value === null || value === undefined) return "";

  let text = Array.isArray(value) ? value.join("; ") : String(value);

  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/** Header row + one data row, separated by CRLF as RFC 4180 specifies. */
export function workRequestToCsv(payload) {
  const header = CSV_COLUMNS.map((column) => toCsvCell(column.header));
  const row = CSV_COLUMNS.map((column) => toCsvCell(column.value(payload)));
  return `${header.join(",")}\r\n${row.join(",")}\r\n`;
}

export function workRequestToJson(payload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** File name based on the request ID, limited to safe characters. */
export function exportFileName(payload, extension) {
  const safeId = String(payload.requestId || "work-request").replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
  return `${safeId}.${extension}`;
}

/**
 * Starts a browser download for generated text, without a server round trip.
 * The UTF-8 byte-order mark helps Excel open accented characters correctly.
 */
export function downloadTextFile(content, fileName, mimeType) {
  const parts = mimeType.startsWith("text/csv") ? ["﻿", content] : [content];
  const blob = new Blob(parts, { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
