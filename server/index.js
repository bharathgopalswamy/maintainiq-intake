import "dotenv/config";
import express from "express";
import path from "path";
import { analyzeWithGemini } from "./geminiService.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (request, response) => {
  response.json({
    status: "ok",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post("/api/intake/analyze", async (request, response) => {
  try {
    const description = request.body?.description?.trim();

    if (!description) {
      return response.status(400).json({
        message: "A maintenance description is required.",
      });
    }

    if (description.length < 15) {
      return response.status(400).json({
        message: "Please provide a more detailed maintenance description.",
      });
    }

    if (description.length > 1500) {
      return response.status(400).json({
        message:
          "The maintenance description must be under 1,500 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return response.status(500).json({
        message: "Gemini has not been configured.",
      });
    }

    const result = await analyzeWithGemini(description);

    return response.json(result);
  } catch (error) {
    console.error("Gemini intake error:", error);

    if (error?.status === 429) {
      return response.status(429).json({
        message:
          "The analysis limit has been reached. Please try again later.",
      });
    }

    return response.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "The request could not be analyzed.",
    });
  }
});

/*
 * Production frontend
 * Render runs the server from the project root, where Vite creates /dist.
 */
const distDirectory = path.resolve(process.cwd(), "dist");

console.log(`Serving frontend from: ${distDirectory}`);

app.use(express.static(distDirectory));

/*
 * React fallback:
 * Any non-API GET request receives index.html.
 */
app.use((request, response, next) => {
  if (
    request.method !== "GET" ||
    request.path.startsWith("/api")
  ) {
    return next();
  }

  return response.sendFile(
    path.join(distDirectory, "index.html"),
    (error) => {
      if (error) {
        console.error("Frontend file error:", error);
        next(error);
      }
    }
  );
});

app.listen(port, "0.0.0.0", () => {
  console.log(`MaintainIQ running on port ${port}`);
});