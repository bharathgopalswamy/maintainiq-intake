# Development log

Daily record of what changed in MaintainIQ Intake, why, and what to understand about it.
Each entry ends with interview practice questions.

---

## 2026-11-26 — Tests, CI, Docker and two bug fixes

### What changed

| Area | Change | Files |
|---|---|---|
| Cleanup | Removed 5 empty files and ~180 lines of unused rule-based code left over from before Gemini was added | `src/utils/*`, `src/components/{ConfidenceBadge,MissingFieldsAlert,SafetyAlert}.jsx`, `src/services/intakeService.js` |
| Lint | ESLint failed with 14 errors. Fixed: server files now use Node globals (`process`), unused variables removed | `eslint.config.js`, `server/workRequestSchema.js` |
| Structure | Split the server into `app.js` (builds the Express app) and `index.js` (starts it). Moved input checks into `validation.js` | `server/app.js`, `server/index.js`, `server/validation.js` |
| Bug fix | Safety keywords matched inside other words, so "firewall" or "unsafely" could trigger a hazard. Now uses whole-word regex (`\b`) | `server/safetyRules.js` |
| Bug fix | On failure the API returned the raw error message (e.g. Zod schema errors) to the browser. Now logs it on the server and returns a generic 502 | `server/app.js` |
| Status codes | Missing API key → 503 (service unavailable) instead of 500; model failure → 502 (bad gateway); unknown `/api` route → JSON 404 | `server/app.js` |
| Tests | 26 tests with Vitest + Supertest across 4 files | `server/__tests__/*` |
| CI | GitHub Actions: lint → test → build, then Docker build | `.github/workflows/ci.yml` |
| Docker | Two-stage Dockerfile, non-root user, health check | `Dockerfile`, `.dockerignore` |

### Key concepts

**Why split `app.js` from `index.js`?** If the file that defines routes also calls `app.listen()`, importing it in a test starts a real server on a port. `createApp()` returns the app without listening, so Supertest can send requests to it in memory. This is the "app factory" pattern.

**Dependency injection.** `createApp({ analyze, isConfigured })` takes the Gemini function as a parameter. Production uses the real one by default; tests pass a fake (`vi.fn()`), so tests are fast, free and don't need an API key or internet.

**`\b` word boundaries.** `\bfire\b` matches "fire" only when it isn't part of a longer word. `escapeRegExp` makes sure keywords containing characters like `.` or `(` are treated literally.

**Why hide error messages?** Internal errors can expose library names, file paths or schema details that help an attacker and confuse users. Log details server-side; show users a safe message.

**502 vs 503 vs 500.** 500 = our own code failed. 502 = an upstream service we depend on (Gemini) returned something bad. 503 = the service is temporarily unavailable (here: not configured).

**Two-stage Docker build.** Stage 1 has dev tools (Vite) to build the frontend. Stage 2 copies only the output and production dependencies, giving a smaller image with less attack surface. `USER node` avoids running as root.

**CI pipeline.** Every push and pull request runs the same checks in a clean machine, so "works on my laptop" problems get caught before merging.

### Verified today
- `npm run lint` passes (was 14 errors)
- `npm test`: 26/26 passing
- `npm run build` succeeds
- Production server started locally; `/api/health`, `/` and input validation responded correctly
- Docker build not yet run (no Docker daemon in the build environment); CI will build it on first push

### Practice questions
1. Why does the test suite not need a Gemini API key?
2. What would happen to "The firewall is down" with the old safety-rule code, and why?
3. Why does the API return 502 instead of the actual error message when Gemini fails?
4. What does each stage of the Dockerfile do, and why not use one stage?
5. What runs in the CI workflow, and in what order?
