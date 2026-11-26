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
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      result.message || "The work request could not be analyzed."
    );
  }

  return result;
}
