/**
 * Error thrown when the API answers with a non-2xx status. `status` and
 * `retryAfterSeconds` let the screen show a specific message (e.g. how long
 * to wait after a 429) without exposing server details.
 */
export class IntakeRequestError extends Error {
  constructor(message, { status, retryAfterSeconds } = {}) {
    super(message);
    this.name = "IntakeRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function readRetryAfter(response, body) {
  const fromHeader = Number(response.headers?.get?.("Retry-After"));
  if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.ceil(fromHeader);

  const fromBody = Number(body?.retryAfterSeconds);
  return Number.isFinite(fromBody) && fromBody > 0 ? Math.ceil(fromBody) : undefined;
}

export async function analyzeWorkRequest(description) {
  const response = await fetch("/api/intake/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: description.trim(),
    }),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new IntakeRequestError("The server returned an invalid response.", {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new IntakeRequestError(
      result.message || "The work request could not be analyzed.",
      {
        status: response.status,
        retryAfterSeconds:
          response.status === 429 ? readRetryAfter(response, result) : undefined,
      }
    );
  }

  return result;
}

/** Turns an API error into a message the operator can act on. */
export function messageForError(error) {
  if (error?.status === 429) {
    const seconds = error.retryAfterSeconds;
    return seconds
      ? `Too many requests. Please wait ${seconds} second${seconds === 1 ? "" : "s"} and try again.`
      : "Too many requests. Please wait a moment and try again.";
  }
  return "The request could not be analyzed. Please try again.";
}
