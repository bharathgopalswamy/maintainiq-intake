import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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
        message: "The maintenance description must be under 1,500 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return response.status(500).json({
        message:
          "Gemini is not configured. Add GEMINI_API_KEY to the root .env file.",
      });
    }

    const result = await analyzeWithGemini(description);

    return response.json(result);
  } catch (error) {
    console.error("Gemini intake error:", error);

    if (
      error?.status === 401 ||
      error?.status === 403 ||
      String(error?.message).toLowerCase().includes("api key")
    ) {
      return response.status(502).json({
        message:
          "Gemini rejected the API key. Check the key in your .env file.",
      });
    }

    if (error?.status === 429) {
      return response.status(429).json({
        message:
          "Gemini usage limit reached. Wait briefly and try again.",
      });
    }

    return response.status(500).json({
      message:
        "Gemini could not analyze this request. Please try again.",
    });
  }
});
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const distDirectory = path.resolve(currentDirectory, "../dist");

app.use(express.static(distDirectory));

app.use((request, response, next) => {
  if (
    request.method === "GET" &&
    !request.path.startsWith("/api")
  ) {
    return response.sendFile(
      path.join(distDirectory, "index.html")
    );
  }

  next();
});
app.listen(port, () => {
  console.log(`MaintainIQ API running at http://localhost:${port}`);
});