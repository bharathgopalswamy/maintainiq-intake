function WorkRequestSuccess({ payload, onCreateAnother }) {
  const copyPayload = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  return (
    <section className="success-layout">
      <div className="panel success-panel">
        <div className="success-icon">✓</div>

        <p className="eyebrow">Verification complete</p>
        <h2>Structured work request created</h2>

        <p>
          The natural-language report was converted into structured CMMS data
          and approved by a human.
        </p>

        <div className="success-details">
          <div>
            <span>Request ID</span>
            <strong>{payload.requestId}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{payload.status}</strong>
          </div>

          <div>
            <span>Priority</span>
            <strong>{payload.workOrder.priority}</strong>
          </div>

          <div>
            <span>Required skill</span>
            <strong>{payload.workOrder.requiredSkill}</strong>
          </div>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="secondary-button"
            onClick={copyPayload}
          >
            Copy JSON
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onCreateAnother}
          >
            Create another request
          </button>
        </div>
      </div>

      <div className="panel payload-panel">
        <div className="payload-heading">
          <div>
            <p className="eyebrow">Integration output</p>
            <h3>CMMS-ready JSON payload</h3>
          </div>

          <span className="verified-badge">Human verified</span>
        </div>

        <pre>{JSON.stringify(payload, null, 2)}</pre>
      </div>
    </section>
  );
}

export default WorkRequestSuccess;