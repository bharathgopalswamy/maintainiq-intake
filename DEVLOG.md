# Development log

Daily record of what changed in MaintainIQ Intake, why, and what to understand about it.
Each entry ends with interview practice questions.

---

## 2026-11-26 — JSON/CSV export, frontend tests, architecture doc

### What changed

| Area | Change | Files |
|---|---|---|
| Feature | Verified record can be downloaded as JSON or CSV (one header row + one data row, 17 columns) named after the request ID | `src/utils/exportWorkRequest.js`, `src/components/WorkRequestSuccess.jsx` |
| Security | CSV cells that start with `=`, `+`, `-` or `@` are prefixed with `'` so a spreadsheet won't run them as formulas | `src/utils/exportWorkRequest.js` |
| UX | "Copy JSON" now confirms success, or explains what to do when the browser blocks the clipboard (it previously failed silently) | `src/components/WorkRequestSuccess.jsx` |
| Bug fix | Review dropdowns were missing "Fire and Life Safety" and "Fire and Life Safety Technician", which the server accepts. A valid value from the server was shown as a different option. Allowed values now come from one shared module used by both the Zod schema and the form | `shared/workRequestOptions.js`, `server/workRequestSchema.js`, `src/components/WorkOrderReview.jsx`, `Dockerfile` |
| Tests | Client test project (jsdom + React Testing Library + user-event): 30 new tests across 5 files. Total 56 | `src/__tests__/*`, `src/test/*`, `vitest.config.js` |
| Docs | `docs/ARCHITECTURE.md` (diagram, lifecycle, data model, decisions), README screenshots, export and testing sections, "How this was built" | `docs/`, `README.md` |

### Key concepts

**Vitest projects.** One `vitest.config.js` defines two projects: `server` runs in Node, `client` runs in jsdom (a simulated browser DOM). `npm test` runs both, so CI checks everything with one command.

**React Testing Library.** Tests find elements the way a user would — by label text or button name (`getByRole("button", { name: "Download CSV" })`) — instead of CSS classes. If a label or button name changes, the test fails, which also catches accessibility regressions.

**Mocking at the boundary.** Component tests replace only the edges: `analyzeWorkRequest` (the API call), `fetch`, `navigator.clipboard` and the file download. Everything in between — state, validation, payload building — runs for real.

**Regression test.** The dropdown test was run against the old component and failed, then passed after the fix. That proves the test actually detects the bug.

**CSV escaping (RFC 4180).** A cell containing a comma, quote or line break must be wrapped in quotes, and quotes inside it doubled (`"` → `""`). Otherwise "Building A, Room 204" would split into two columns.

**CSV injection.** If a user types `=HYPERLINK(...)` as a location and someone opens the CSV in Excel, Excel runs it as a formula. Prefixing with `'` makes it plain text.

**Blob download.** `new Blob([...])` + `URL.createObjectURL` creates a temporary in-browser file; a hidden `<a download>` link is clicked and the URL is released. No server round trip or storage.

**Single source of truth.** The same list of allowed values feeds the server's validation and the browser's dropdowns, so they can't drift apart again.

### Verified today
- `npm run lint` passes
- `npm test`: 56/56 passing (26 server + 30 client)
- `npm run build` succeeds
- Regression test fails on the previous `WorkOrderReview.jsx` and passes with the fix
- Production build run locally with a fake analyzer; a real Chromium download produced `WR-xxxxxxxx.csv` with the expected header and quoted location; screenshots captured from that run

### Practice questions
1. Why do the component tests fake `analyzeWorkRequest` and `fetch` but not the review form's state?
2. What is CSV injection, and how does the export prevent it?
3. How would "Building A, Room 204" break a CSV without quoting, and what does RFC 4180 say to do?
4. What was the dropdown bug, how did you prove the fix, and how does the shared module stop it recurring?
5. Why generate the export in the browser instead of adding a server endpoint? When would you move it to the server?

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
