import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two test projects:
// - server: API, validation and safety rules, run in Node
// - client: React components and browser utilities, run in a simulated
//   browser (jsdom) with React Testing Library
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          environment: "node",
          include: ["server/**/*.test.js"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/**/*.test.{js,jsx}"],
          setupFiles: ["./src/test/setup.js"],
        },
      },
    ],
  },
});
