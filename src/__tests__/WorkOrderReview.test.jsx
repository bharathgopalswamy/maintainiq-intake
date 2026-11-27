import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkOrderReview from "../components/WorkOrderReview.jsx";
import { makeAnalysis } from "../test/fixtures.js";

function renderReview(analysis = makeAnalysis()) {
  const onConfirm = vi.fn();
  const onBack = vi.fn();
  render(<WorkOrderReview analysis={analysis} onConfirm={onConfirm} onBack={onBack} />);
  return { onConfirm, onBack, user: userEvent.setup() };
}

const confirmButton = () => screen.getByRole("button", { name: "Confirm reviewed record" });
const reviewCheckbox = () => screen.getByRole("checkbox");

describe("WorkOrderReview", () => {
  it("pre-fills the form with the suggested values", () => {
    renderReview();

    expect(screen.getByLabelText(/Request title/)).toHaveValue("Conveyor stopped with oil leak");
    expect(screen.getByLabelText(/Location/)).toHaveValue("Packaging Line 2");
    expect(screen.getByLabelText("Suggested priority")).toHaveValue("High");
    expect(screen.getByLabelText("Required skill")).toHaveValue("Mechanical Technician");
  });

  it("offers every category and skill the server can return", () => {
    // Regression: the dropdowns used to be missing "Fire and Life Safety",
    // so a valid server value was displayed as a different option.
    renderReview(
      makeAnalysis({
        assetCategory: "Fire and Life Safety",
        requiredSkill: "Fire and Life Safety Technician",
      })
    );

    expect(screen.getByLabelText("Asset category")).toHaveValue("Fire and Life Safety");
    expect(screen.getByLabelText("Required skill")).toHaveValue(
      "Fire and Life Safety Technician"
    );
  });

  it("shows safety flags returned by the analysis", () => {
    renderReview(makeAnalysis({ safetyFlags: ["Possible gas leak"] }));

    const alert = screen.getByText("Potential safety concern detected").parentElement;
    expect(within(alert).getByText("Possible gas leak")).toBeInTheDocument();
  });

  it("lists required fields that are empty and blocks confirmation", async () => {
    const { user, onConfirm } = renderReview(makeAnalysis({ location: "", asset: "" }));

    expect(screen.getByText("Location, Affected asset")).toBeInTheDocument();

    await user.click(reviewCheckbox());
    await user.click(confirmButton());

    expect(screen.getByText("Complete the required fields before confirming.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("requires the reviewer to tick the confirmation box", async () => {
    const { user, onConfirm } = renderReview();

    await user.click(confirmButton());

    expect(
      screen.getByText("Confirm that you reviewed the AI-generated information.")
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("marks edited fields and records them in the payload", async () => {
    const { user, onConfirm } = renderReview();

    const location = screen.getByLabelText(/Location/);
    await user.clear(location);
    await user.type(location, "  Packaging Line 3  ");
    await user.selectOptions(screen.getByLabelText("Suggested priority"), "Medium");

    expect(screen.getAllByText("Edited")).toHaveLength(2);

    await user.click(reviewCheckbox());
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0];
    expect(payload).toMatchObject({
      status: "Verified",
      humanVerified: true,
      humanEditedFields: ["location", "suggestedPriority"],
      workOrder: { location: "Packaging Line 3", priority: "Medium" },
    });
    expect(payload.requestId).toMatch(/^WR-\d{8}$/);
  });

  it("uses 'Not provided' when the access restriction is blank", async () => {
    const { user, onConfirm } = renderReview(makeAnalysis({ accessRestriction: "" }));

    await user.click(reviewCheckbox());
    await user.click(confirmButton());

    expect(onConfirm.mock.calls[0][0].workOrder.accessRestriction).toBe("Not provided");
  });

  it("goes back without confirming", async () => {
    const { user, onBack, onConfirm } = renderReview();

    await user.click(screen.getByRole("button", { name: "Back to request" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
