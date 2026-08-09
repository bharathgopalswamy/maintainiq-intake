import { useMemo, useState } from "react";

const editableFields = [
  {
    name: "requestTitle",
    label: "Request title",
    type: "text",
    required: true,
  },
  {
    name: "location",
    label: "Location",
    type: "text",
    required: true,
  },
  {
    name: "assetCategory",
    label: "Asset category",
    type: "select",
    options: [
      "HVAC",
      "Electrical",
      "Plumbing",
      "Mechanical",
      "Building",
      "Vertical Transportation",
      "General",
    ],
  },
  {
    name: "asset",
    label: "Affected asset",
    type: "text",
    required: true,
  },
  {
    name: "problemType",
    label: "Problem type",
    type: "text",
    required: true,
  },
  {
    name: "suggestedPriority",
    label: "Suggested priority",
    type: "select",
    options: [
      "Low",
      "Medium",
      "High",
      "Urgent Review",
      "Planner Review",
    ],
  },
  {
    name: "accessRestriction",
    label: "Access restriction",
    type: "text",
  },
  {
    name: "requiredSkill",
    label: "Required skill",
    type: "select",
    options: [
      "HVAC Technician",
      "Electrician",
      "Plumber",
      "Mechanical Technician",
      "Elevator Technician",
      "General Maintenance Technician",
    ],
  },
  {
    name: "suggestedDuration",
    label: "Suggested duration",
    type: "text",
  },
];



function WorkOrderReview({ analysis, onBack, onConfirm }) {
  const [formData, setFormData] = useState(analysis);
  const [editedFields, setEditedFields] = useState([]);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [error, setError] = useState("");

  const currentMissingFields = useMemo(() => {
    const missing = [];

    if (!formData.requestTitle.trim()) {
      missing.push("Request title");
    }

    if (!formData.location.trim()) {
      missing.push("Location");
    }

    if (!formData.asset.trim()) {
      missing.push("Affected asset");
    }

    if (!formData.problemType.trim()) {
      missing.push("Problem type");
    }

    return missing;
  }, [formData]);

  const updateField = (name, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setEditedFields((currentFields) =>
      currentFields.includes(name)
        ? currentFields
        : [...currentFields, name]
    );
  };

  const handleConfirm = () => {
    if (currentMissingFields.length > 0) {
      setError("Complete the required fields before confirming.");
      return;
    }

    if (!confirmationChecked) {
      setError("Confirm that you reviewed the AI-generated information.");
      return;
    }

    const payload = {
      requestId: `WR-${Date.now().toString().slice(-8)}`,
      status: "Verified",
      source: "MaintainIQ Work Request Intake",
      createdAt: new Date().toISOString(),
      humanVerified: true,
      humanEditedFields: editedFields,
      workOrder: {
        requestTitle: formData.requestTitle.trim(),
        location: formData.location.trim(),
        assetCategory: formData.assetCategory,
        asset: formData.asset.trim(),
        problemType: formData.problemType.trim(),
        description: formData.description.trim(),
        priority: formData.suggestedPriority,
        accessRestriction:
          formData.accessRestriction.trim() || "Not provided",
        requiredSkill: formData.requiredSkill,
        estimatedDuration: formData.suggestedDuration,
        safetyFlags: formData.safetyFlags,
      },
    };

    onConfirm(payload);
  };

  return (
    <section className="review-layout">
      <div className="review-main">
        <div className="panel">
          <div className="section-heading">
            <span className="step-number">2</span>

            <div>
              <p className="eyebrow">Human verification</p>
              <h2>Review the suggested work-order fields</h2>
              <p>
                Review the suggested values and correct anything that is incomplete
or inaccurate.
              </p>
            </div>
          </div>

          {formData.safetyFlags.length > 0 && (
            <div className="safety-alert">
              <div className="alert-icon">!</div>

              <div>
                <strong>Potential safety concern detected</strong>

                <ul>
                  {formData.safetyFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>

                <p>
                  The prototype never automatically downgrades a potential
                  safety issue.
                </p>
              </div>
            </div>
          )}

          {currentMissingFields.length > 0 && (
            <div className="missing-alert">
              <strong>Information requiring human input:</strong>
              <span>{currentMissingFields.join(", ")}</span>
            </div>
          )}

          <div className="form-grid">
            {editableFields.map((field) => {
              
              const wasEdited = editedFields.includes(field.name);

              return (
                <div
                  className={`form-field ${
                    field.name === "requestTitle" ? "full-width" : ""
                  }`}
                  key={field.name}
                >
                  <div className="field-heading">
  <label htmlFor={field.name}>
    {field.label}
    {field.required && <span className="required">*</span>}
  </label>

  {wasEdited && (
    <span className="edited-badge">Edited</span>
  )}
</div>

                  {field.type === "select" ? (
                    <select
                      id={field.name}
                      value={formData[field.name]}
                      onChange={(event) =>
                        updateField(field.name, event.target.value)
                      }
                    >
                      {field.options.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      type="text"
                      value={formData[field.name]}
                      onChange={(event) =>
                        updateField(field.name, event.target.value)
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              );
            })}

            <div className="form-field full-width">
              <div className="field-heading">
                <label htmlFor="description">
                  Work description
                  <span className="required">*</span>
                </label>

                {editedFields.includes("description") && (
  <span className="edited-badge">Edited</span>
)}
              </div>

              <textarea
                id="description"
                rows={5}
                value={formData.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="panel approval-panel">
          <label className="confirmation-row">
            <input
              type="checkbox"
              checked={confirmationChecked}
              onChange={(event) =>
                setConfirmationChecked(event.target.checked)
              }
            />

            <span>
              I reviewed the suggested fields, safety warnings and priority.
The information is ready to become a structured work request.
            </span>
          </label>

          {error && <div className="inline-error">{error}</div>}

          <div className="action-row">
            <button
              type="button"
              className="secondary-button"
              onClick={onBack}
            >
              Back to request
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={handleConfirm}
            >
              Confirm reviewed record
            </button>
          </div>
        </div>
      </div>

      <aside className="panel audit-panel">
        <p className="eyebrow">Review summary</p>
        <h3>Human oversight record</h3>

        <div className="audit-stat">
          <span>Suggested fields</span>
          <strong>{editableFields.length + 1}</strong>
        </div>

        <div className="audit-stat">
          <span>Fields edited during review</span>
          <strong>{editedFields.length}</strong>
        </div>

        <div className="audit-stat">
          <span>Safety flags</span>
          <strong>{formData.safetyFlags.length}</strong>
        </div>

        <div className="audit-stat">
          <span>Required fields missing</span>
          <strong>{currentMissingFields.length}</strong>
        </div>

        <div className="audit-note">
          <strong>Why this matters</strong>
          <p>
           The review record identifies changes made before the request was
confirmed.
          </p>
        </div>
      </aside>
    </section>
  );
}

export default WorkOrderReview;