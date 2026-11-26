import { describe, expect, it, vi } from "vitest";
import {
  CSV_COLUMNS,
  downloadTextFile,
  exportFileName,
  toCsvCell,
  workRequestToCsv,
  workRequestToJson,
} from "../utils/exportWorkRequest.js";
import { makePayload } from "../test/fixtures.js";

describe("toCsvCell", () => {
  it("leaves plain text unchanged", () => {
    expect(toCsvCell("Room 204")).toBe("Room 204");
  });

  it("quotes cells containing commas, quotes or line breaks", () => {
    expect(toCsvCell("Line 2, sealing station")).toBe('"Line 2, sealing station"');
    expect(toCsvCell('The "main" motor')).toBe('"The ""main"" motor"');
    expect(toCsvCell("first line\nsecond line")).toBe('"first line\nsecond line"');
  });

  it("joins lists with semicolons", () => {
    expect(toCsvCell(["Possible gas leak", "Potential risk to occupants"])).toBe(
      "Possible gas leak; Potential risk to occupants"
    );
    expect(toCsvCell([])).toBe("");
  });

  it("turns missing values into empty cells", () => {
    expect(toCsvCell(undefined)).toBe("");
    expect(toCsvCell(null)).toBe("");
  });

  it("neutralises values a spreadsheet would run as formulas", () => {
    expect(toCsvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(toCsvCell("+1 call")).toBe("'+1 call");
    expect(toCsvCell("-5 degrees")).toBe("'-5 degrees");
    expect(toCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("workRequestToCsv", () => {
  it("produces a header row and one data row in column order", () => {
    const csv = workRequestToCsv(makePayload());
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(3); // header, row, trailing empty string
    expect(lines[2]).toBe("");
    expect(lines[0].split(",")).toEqual(CSV_COLUMNS.map((c) => c.header));
    expect(lines[1]).toContain("WR-12345678,Verified,2026-11-26T15:00:00.000Z,Yes,location,");
  });

  it("keeps a field with commas as a single cell", () => {
    const payload = makePayload();
    payload.workOrder.location = "Building A, Room 204";

    const row = workRequestToCsv(payload).split("\r\n")[1];
    expect(row).toContain('"Building A, Room 204"');
  });
});

describe("workRequestToJson", () => {
  it("round-trips to the same object", () => {
    const payload = makePayload();
    expect(JSON.parse(workRequestToJson(payload))).toEqual(payload);
  });
});

describe("exportFileName", () => {
  it("uses the request ID and strips unsafe characters", () => {
    expect(exportFileName(makePayload(), "csv")).toBe("WR-12345678.csv");
    expect(exportFileName(makePayload({ requestId: "../etc/x" }), "json")).toBe(
      "___etc_x.json"
    );
  });
});

describe("downloadTextFile", () => {
  it("creates a temporary link, clicks it and releases the object URL", () => {
    URL.createObjectURL = vi.fn(() => "blob:fake");
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadTextFile("a,b\r\n", "WR-1.csv", "text/csv;charset=utf-8");

    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0].download).toBe("WR-1.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
