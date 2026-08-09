import { useState } from "react";
import { analyzeWorkRequest } from "../services/intakeService.js";

const sampleRequest =
  "The conveyor on Packaging Line 2 stopped at 10:15 a.m. Product is backing up near the sealing station, and there appears to be oil beneath the motor. The line supervisor has stopped production and restricted access to the area.";

function WorkRequestIntake({ onAnalysisComplete }) {
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (description.trim().length < 15) {
      setError("Please describe the problem, affected equipment and location.");
      return;
    }

    try {
      setError("");
      setIsAnalyzing(true);

      const result = await analyzeWorkRequest(description);
      onAnalysisComplete(result);
    } catch (analysisError) {
      console.error(analysisError);
      setError("The request could not be analyzed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="intake-layout">
      <div className="panel intake-panel">
        <div className="section-heading">
          <span className="step-number">1</span>

          <div>
            <p className="eyebrow">Initial maintenance report</p>

            <h2>Describe what happened</h2>

            <p>
              Enter the issue as an operator might report it by phone, email or
              mobile. The prototype will organize the description into
              structured fields for review.
            </p>
          </div>
        </div>
        <label className="field-label" htmlFor="request-description">
          Operator report
        </label>

        <textarea
          id="request-description"
          className="request-textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Example: The conveyor on Packaging Line 2 stopped at 10:15 a.m. Product is backing up near the sealing station, and there appears to be oil beneath the motor."
          rows={9}
          maxLength={1500}
        />

        <div className="textarea-footer">
          <span>{description.length}/1500 characters</span>

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setDescription(sampleRequest);
              setError("");
            }}
          >
            Use example request
          </button>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <button
          type="button"
          className="primary-button analyze-button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner" />
              Preparing work-request fields…
            </>
          ) : (
            "Prepare fields for review"
          )}
        </button>
      </div>

     <aside className="panel explanation-panel">
  <p className="eyebrow">Purpose of this concept</p>

  <h3>Supporting existing DirectLine work-request entry</h3>

  <ol className="feature-steps">
    <li>
      <strong>Captures the initial report</strong>
      <span>
        Accepts the issue in the operator’s own words before
        structured entry
      </span>
    </li>

    <li>
      <strong>Organizes the information</strong>
      <span>
        Suggests the location, asset, problem type and access details
      </span>
    </li>

    <li>
      <strong>Highlights follow-up needs</strong>
      <span>
        Surfaces possible safety concerns and missing information
      </span>
    </li>

    <li>
      <strong>Keeps the reviewer in control</strong>
      <span>
        Every suggested value can be corrected before confirmation
      </span>
    </li>
  </ol>

  <div className="privacy-note">
    <span className="privacy-icon">✓</span>

    <div>
      <strong>Designed for workflow handoff</strong>

      <p>
        The final result is a conceptual structured record that
        could be mapped to an approved DirectLine API or configured
        workflow.
      </p>
    </div>
  </div>
</aside>
    </section>
  );
}

export default WorkRequestIntake;
