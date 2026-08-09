import { useState } from "react";
import WorkRequestIntake from "./components/WorkRequestIntake.jsx";
import WorkOrderReview from "./components/WorkOrderReview.jsx";
import WorkRequestSuccess from "./components/WorkRequestSuccess.jsx";

function App() {
  const [currentStep, setCurrentStep] = useState("intake");
  const [analysis, setAnalysis] = useState(null);
  const [completedPayload, setCompletedPayload] = useState(null);

  const handleAnalysisComplete = (result) => {
    setAnalysis(result);
    setCurrentStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirm = (payload) => {
    setCompletedPayload(payload);
    setCurrentStep("complete");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setAnalysis(null);
    setCompletedPayload(null);
    setCurrentStep("intake");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" onClick={(event) => {
          event.preventDefault();
          restart();
        }}>
          <span className="brand-mark">M</span>

          <span>
            <strong>MaintainIQ</strong>
           <small>Work Request Intake Concept</small>
          </span>
        </a>
<div className="prototype-badge">
  Independent workflow concept
</div>
      </header>

      <main>
        <section className="hero">
         <div>
  <p className="eyebrow">
    Exploring a DirectLine workflow enhancement
  </p>

  <h1>
    From a plain-language report to a review-ready work request.
  </h1>

  <p className="hero-description">
    This independent concept explores how an operator’s initial
    maintenance description could prefill structured fields before
    the request continues through an existing DirectLine workflow.
    Every suggested value remains editable and requires human review.
  </p>
</div>
          <div className="progress-card">
            <div
              className={`progress-item ${
                currentStep === "intake" ? "active" : "complete"
              }`}
            >
              <span>1</span>
              <div>
                <strong>Describe</strong>
                <small>Natural-language request</small>
              </div>
            </div>

           <div
  className={`progress-item ${
    currentStep === "intake" ? "active" : "complete"
  }`}
>
  <span>1</span>

  <div>
    <strong>Report</strong>
    <small>Describe the issue naturally</small>
  </div>
</div>

<div
  className={`progress-item ${
    currentStep === "review"
      ? "active"
      : currentStep === "complete"
      ? "complete"
      : ""
  }`}
>
  <span>2</span>

  <div>
    <strong>Review</strong>
    <small>Verify the suggested fields</small>
  </div>
</div>

<div
  className={`progress-item ${
    currentStep === "complete" ? "active" : ""
  }`}
>
  <span>3</span>

  <div>
    <strong>Prepare</strong>
    <small>Create a structured record</small>
  </div>
</div>
          </div>
        </section>

        {currentStep === "intake" && (
          <WorkRequestIntake
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {currentStep === "review" && analysis && (
          <WorkOrderReview
            analysis={analysis}
            onBack={() => setCurrentStep("intake")}
            onConfirm={handleConfirm}
          />
        )}

        {currentStep === "complete" && completedPayload && (
          <WorkRequestSuccess
            payload={completedPayload}
            onCreateAnother={restart}
          />
        )}

      
      </main>

      <footer>
        <footer>
  Independent concept created to explore a potential enhancement to
  existing DirectLine workflows. Uses fictional data and is not
  connected to or endorsed by Megamation.
</footer>
      </footer>
    </div>
  );
}

export default App;