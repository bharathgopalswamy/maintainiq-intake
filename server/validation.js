export const MIN_DESCRIPTION_LENGTH = 15;
export const MAX_DESCRIPTION_LENGTH = 1500;

/**
 * Checks a raw maintenance description before it is sent to the AI model.
 * Returns { ok: true, description } or { ok: false, message }.
 */
export function validateDescription(rawDescription) {
  if (typeof rawDescription !== "string" || !rawDescription.trim()) {
    return { ok: false, message: "A maintenance description is required." };
  }

  const description = rawDescription.trim();

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: "Please provide a more detailed maintenance description.",
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: "The maintenance description must be under 1,500 characters.",
    };
  }

  return { ok: true, description };
}
