import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkRequestSuccess from "../components/WorkRequestSuccess.jsx";
import * as exporter from "../utils/exportWorkRequest.js";
import { makePayload } from "../test/fixtures.js";

function renderSuccess(payload = makePayload()) {
  const user = userEvent.setup();
  const onCreateAnother = vi.fn();
  render(<WorkRequestSuccess payload={payload} onCreateAnother={onCreateAnother} />);
  return { user, onCreateAnother };
}

describe("WorkRequestSuccess", () => {
  it("summarises the verified request", () => {
    renderSuccess();

    expect(screen.getByText("WR-12345678")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Technician")).toBeInTheDocument();
  });

  it("downloads the request as CSV named after the request ID", async () => {
    const download = vi.spyOn(exporter, "downloadTextFile").mockImplementation(() => {});
    const { user } = renderSuccess();

    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    const [content, fileName, mimeType] = download.mock.calls[0];
    expect(fileName).toBe("WR-12345678.csv");
    expect(mimeType).toBe("text/csv;charset=utf-8");
    expect(content.startsWith("Request ID,Status,")).toBe(true);
  });

  it("downloads the request as JSON", async () => {
    const download = vi.spyOn(exporter, "downloadTextFile").mockImplementation(() => {});
    const payload = makePayload();
    const { user } = renderSuccess(payload);

    await user.click(screen.getByRole("button", { name: "Download JSON" }));

    const [content, fileName, mimeType] = download.mock.calls[0];
    expect(fileName).toBe("WR-12345678.json");
    expect(mimeType).toBe("application/json");
    expect(JSON.parse(content)).toEqual(payload);
  });

  it("confirms when the JSON is copied", async () => {
    const { user } = renderSuccess();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();

    await user.click(screen.getByRole("button", { name: "Copy JSON" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("JSON copied to clipboard.");
  });

  it("explains what to do when the clipboard is blocked", async () => {
    const { user } = renderSuccess();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));

    await user.click(screen.getByRole("button", { name: "Copy JSON" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Copy failed. Use Download JSON instead."
    );
  });

  it("starts a new request", async () => {
    const { user, onCreateAnother } = renderSuccess();

    await user.click(screen.getByRole("button", { name: "Create another request" }));

    expect(onCreateAnother).toHaveBeenCalledTimes(1);
  });
});
