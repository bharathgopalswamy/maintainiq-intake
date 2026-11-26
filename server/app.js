import express from "express";
import path from "path";
import { analyzeWithGemini } from "./geminiService.js";
import { validateDescription } from "./validation.js";

/**
 * Builds the Express app without starting it, so tests can call the
 * routes directly and swap the AI analyzer for a fake one.
 */
export function createApp({
  analyze = analyzeWithGemini,
  isConfigured = () => Boolean(process.env.GEMINI_API_KEY),
  distDirectory = path.resolve(process.cwd(), "dist"),
} = {}) {
  const app = express();

  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", (request, response) => {
    response.json({ status: "ok", geminiConfigured: isConfigured() });
  });

  app.post("/api/intake/analyze", async (request, response) => {
    const validation = validateDescription(request.body?.description);

    if (!validation.ok) {
      return response.status(400).json({ message: validation.message });
    }

    if (!isConfigured()) {
      return response
        .status(503)
        .json({ message: "The analysis service is not configured." });
    }

    try {
      const result = await analyze(validation.description);
      return response.json(result);
    } catch (error) {
      console.error("Gemini intake error:", error);

      if (error?.status === 429) {
        return response.status(429).json({
          message: "The analysis limit has been reached. Please try again later.",
        });
      }

      // Never send internal error details (stack traces, schema errors,
      // provider messages) to the browser.
      return response
        .status(502)
        .json({ message: "The request could not be analyzed. Please try again." });
    }
  });

  // Production frontend: Vite builds the React app into /dist.
  app.use(express.static(distDirectory));

  // React fallback: any non-API GET request receives index.html.
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api")) {
      return next();
    }

    return response.sendFile(path.join(distDirectory, "index.html"), (error) => {
      if (error) next(error);
    });
  });

  // Unknown API routes return JSON instead of an HTML error page.
  app.use("/api", (request, response) => {
    response.status(404).json({ message: "Not found." });
  });

  return app;
}
