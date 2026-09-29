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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            restart();
          }}
        >
          <span className="brand-mark">M</span>
          <span>
            <strong>MaintainIQ</strong>
            <small>Maintenance Request Management</small>
          </span>
        </a>

        <div className="prototype-badge">AI-assisted intake</div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">A simpler way to report maintenance issues</p>

            <h1>
              From a plain-language report to a review-ready work request.
            </h1>

            <p className="hero-description">
              Describe a maintenance issue in your own words. MaintainIQ
              suggests structured request details for you to review and edit
              before preparing the final record.
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
          <WorkRequestIntake onAnalysisComplete={handleAnalysisComplete} />
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
        MaintainIQ · AI-assisted maintenance request intake
      </footer>
    </div>
  );
}

export default App;