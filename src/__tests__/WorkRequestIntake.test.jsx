import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkRequestIntake from "../components/WorkRequestIntake.jsx";
import * as intakeService from "../services/intakeService.js";
import { makeAnalysis } from "../test/fixtures.js";

describe("WorkRequestIntake", () => {
  it("asks for more detail when the report is too short and does not call the API", async () => {
    const user = userEvent.setup();
    const analyze = vi.spyOn(intakeService, "analyzeWorkRequest");
    render(<WorkRequestIntake onAnalysisComplete={vi.fn()} />);

    await user.type(screen.getByLabelText("Operator report"), "Broken");
    await user.click(screen.getByRole("button", { name: "Prepare fields for review" }));

    expect(
      screen.getByText("Please describe the problem, affected equipment and location.")
    ).toBeInTheDocument();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("fills the example request and updates the character count", async () => {
    const user = userEvent.setup();
    render(<WorkRequestIntake onAnalysisComplete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Use example request" }));

    const textarea = screen.getByLabelText("Operator report");
    expect(textarea.value).toMatch(/^The conveyor on Packaging Line 2/);
    expect(screen.getByText(`${textarea.value.length}/1500 characters`)).toBeInTheDocument();
  });

  it("sends the report and passes the analysis to the next step", async () => {
    const user = userEvent.setup();
    const analysis = makeAnalysis();
    const analyze = vi
      .spyOn(intakeService, "analyzeWorkRequest")
      .mockResolvedValue(analysis);
    const onAnalysisComplete = vi.fn();
    render(<WorkRequestIntake onAnalysisComplete={onAnalysisComplete} />);

    await user.type(
      screen.getByLabelText("Operator report"),
      "The air conditioner in Room 204 stopped cooling."
    );
    await user.click(screen.getByRole("button", { name: "Prepare fields for review" }));

    expect(analyze).toHaveBeenCalledWith(
      "The air conditioner in Room 204 stopped cooling."
    );
    expect(onAnalysisComplete).toHaveBeenCalledWith(analysis);
  });

  it("shows a friendly error and re-enables the button when analysis fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(intakeService, "analyzeWorkRequest").mockRejectedValue(
      new Error("Gemini 500: internal details")
    );
    const onAnalysisComplete = vi.fn();
    render(<WorkRequestIntake onAnalysisComplete={onAnalysisComplete} />);

    await user.click(screen.getByRole("button", { name: "Use example request" }));
    await user.click(screen.getByRole("button", { name: "Prepare fields for review" }));

    expect(
      await screen.findByText("The request could not be analyzed. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/internal details/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare fields for review" })).toBeEnabled();
    expect(onAnalysisComplete).not.toHaveBeenCalled();
  });
});
