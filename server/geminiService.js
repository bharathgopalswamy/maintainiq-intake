import { GoogleGenAI } from "@google/genai";
import {
  validateWorkRequest,
  workRequestJsonSchema,
} from "./workRequestSchema.js";
import { applySafetyRules } from "./safetyRules.js";

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY was not found. Check the root .env file."
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function buildPrompt(description) {
  return `
You are an AI-assisted CMMS work-request intake system.

Extract information from the maintenance report and return the exact JSON
structure specified by the response schema.

Rules:

- Use the exact camelCase property names from the schema.
- Include every required property.
- Do not create additional properties.
- Use an empty string when information is not stated.
- Never invent a location, asset ID, date, time or restriction.
- Add unknown important information to missingFields.
- safetyFlags must always be an array.
- missingFields must always be an array.
- If a potential safety hazard exists, use "Urgent Review".
- Otherwise use Low, Medium, High or Planner Review.
- Use "Planner confirmation required" when duration is uncertain.
- Preserve the factual meaning of the original report.

Required properties:

requestTitle
location
assetCategory
asset
problemType
description
suggestedPriority
accessRestriction
requiredSkill
suggestedDuration
safetyFlags
missingFields


Maintenance report:

${description}
`;
}

function parseGeminiJson(responseText) {
  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  let cleanedText = responseText.trim();

  // Remove Markdown fences such as ```json and ```
  cleanedText = cleanedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract only the first complete JSON object
  const firstBrace = cleanedText.indexOf("{");
  const lastBrace = cleanedText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini did not return a JSON object.");
  }

  cleanedText = cleanedText.slice(firstBrace, lastBrace + 1);

  return JSON.parse(cleanedText);
}

export async function analyzeWithGemini(description) {
  const ai = createGeminiClient();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: buildPrompt(description),

    config: {
      responseMimeType: "application/json",
      responseJsonSchema: workRequestJsonSchema,
    },
  });

  const parsedResponse = parseGeminiJson(response.text);
  const validatedResponse = validateWorkRequest(parsedResponse);

  const safetyCheckedResponse = applySafetyRules(
    validatedResponse,
    description
  );

  return {
  ...safetyCheckedResponse,
  description,
};
}