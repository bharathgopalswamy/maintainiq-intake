import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { makeAnalysis } from "../test/fixtures.js";

// End-to-end flow in the browser layer: only the network call is faked.
describe("App flow", () => {
  it("goes from report to review to a verified, exportable record", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeAnalysis({ safetyFlags: ["Possible gas leak"] })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Use example request" }));
    await user.click(screen.getByRole("button", { name: "Prepare fields for review" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/intake/analyze",
      expect.objectContaining({ method: "POST" })
    );
    expect(
      await screen.findByRole("heading", { name: "Review the suggested work-order fields" })
    ).toBeInTheDocument();
    expect(screen.getByText("Possible gas leak")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm reviewed record" }));

    expect(
      screen.getByRole("heading", { name: "Structured work request created" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create another request" }));
    expect(screen.getByLabelText("Operator report")).toHaveValue("");
  });

  it("shows the server's error state without leaving the intake step", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "The analysis service is not configured." }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Use example request" }));
    await user.click(screen.getByRole("button", { name: "Prepare fields for review" }));

    expect(
      await screen.findByText("The request could not be analyzed. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Operator report")).toBeInTheDocument();
  });
});
