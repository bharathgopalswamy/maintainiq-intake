# CMMS Work Request Intake Concept

An independent proof-of-concept that explores how a plain-language maintenance report could be converted into structured work-request fields before continuing through an existing CMMS workflow.

The application uses Gemini to extract relevant information, applies deterministic safety checks, validates the resulting structure and requires a person to review the information before preparing the final record.

> This is an independent portfolio project. It is not affiliated with, endorsed by or connected to Megamation or DirectLine.

## Project objective

Maintenance issues may initially be communicated through speech, phone calls, email, mobile messages or unstructured descriptions.

For example:

> The conveyor on Packaging Line 2 stopped at 10:15 a.m. Product is backing up near the sealing station, and there appears to be oil beneath the motor.

Before this information can be used effectively in a CMMS, it may need to be organized into fields such as:

- Request title
- Location
- Asset and asset category
- Problem type
- Work description
- Suggested priority
- Access restrictions
- Required maintenance skill
- Potential safety concerns
- Missing information

This prototype explores whether preparing those fields automatically could support an existing structured work-request process.

It does not attempt to replace a CMMS, maintenance planner or existing work-order workflow.

## Core workflow

1. An operator enters a maintenance issue in their own words.
2. The React application sends the description to the Express API.
3. The Express server sends the report to Gemini.
4. Gemini extracts the information into a predefined JSON structure.
5. Zod validates the returned fields and permitted values.
6. Deterministic safety rules independently inspect the original report.
7. The application displays the prepared fields for human review.
8. The reviewer can correct or complete the information.
9. After confirmation, the application produces a structured JSON record.

```text
Plain-language report
        ↓
Gemini field extraction
        ↓
Schema validation
        ↓
Deterministic safety checks
        ↓
Human review and correction
        ↓
Structured work-request payload
```

## Features

### Plain-language intake

Users can report a maintenance problem without first understanding every CMMS field or maintenance classification.

### Structured field preparation

The application prepares fields including:

- Request title
- Location
- Asset category
- Affected asset
- Problem type
- Description
- Suggested priority
- Access restrictions
- Required maintenance skill
- Suggested duration
- Safety flags
- Missing information

### Human verification

The extracted information is never submitted automatically.

The reviewer can:

- Correct inaccurate suggestions
- Complete missing fields
- Change the category or priority
- Review potential safety concerns
- Confirm the final structured record

### Safety checks

Safety identification does not depend entirely on the language model.

The backend also uses deterministic rules to detect terms related to:

- Fire or smoke
- Gas leaks
- Electrical hazards
- Slippery or flooded areas
- Trapped occupants
- Injuries or unsafe conditions
- Hazardous materials

When a possible safety concern is detected, the record is marked for urgent human review.

### Structured output

After verification, the application prepares a JSON payload that demonstrates how the information could eventually be mapped to an approved CMMS API or configured workflow.

No real CMMS record is created by this prototype.

## Example

### Input

```text
The air conditioner in Room 204 stopped cooling this morning.
It is making a loud noise, and water is making the floor slippery.
Students are using the room until 3 p.m.
```

### Prepared information

```json
{
  "requestTitle": "Air conditioner cooling failure and water leak",
  "location": "Room 204",
  "assetCategory": "HVAC",
  "asset": "Air conditioner",
  "problemType": "Cooling failure and water leak",
  "description": "The air conditioner stopped cooling, is making a loud noise, and is leaking water.",
  "suggestedPriority": "Urgent Review",
  "accessRestriction": "Students are using the room until 3 p.m.",
  "requiredSkill": "HVAC Technician",
  "suggestedDuration": "Planner confirmation required",
  "safetyFlags": [
    "Possible slip or flooding hazard"
  ],
  "missingFields": []
}
```

## Technology stack

### Frontend

- React
- JSX
- Vite
- CSS

### Backend

- Node.js
- Express
- Gemini API
- Zod
- dotenv

### Deployment

- GitHub for source control
- Render for the React production build and Express API

## Architecture

```text
Browser
  └── React interface
        └── POST /api/intake/analyze
              └── Express server
                    ├── Gemini extraction
                    ├── Zod validation
                    └── Safety rules
                          └── Structured response
                                └── Human review screen
```

## Project structure

```text
maintainiq-intake/
├── public/
├── server/
│   ├── index.js
│   ├── geminiService.js
│   ├── safetyRules.js
│   └── workRequestSchema.js
├── src/
│   ├── components/
│   │   ├── WorkRequestIntake.jsx
│   │   ├── WorkOrderReview.jsx
│   │   └── WorkRequestSuccess.jsx
│   ├── services/
│   │   └── intakeService.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

The exact component locations may differ slightly depending on the local folder organization.

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- Gemini API key

### Installation

Clone the repository:

```bash
git clone https://github.com/bharathgopalswamy/maintainiq-intake.git
cd maintainiq-intake
```

Install the dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
PORT=3001
```

Do not add quotes around the API key.

Do not commit the `.env` file.

### Development

Start the React frontend and Express backend together:

```bash
npm run dev
```

Development addresses:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3001
Health:   http://localhost:5173/api/health
```

### Production test

Create the React production build:

```bash
npm run build
```

Start Express:

```bash
npm start
```

Open:

```text
http://localhost:3001
```

In production mode, Express serves both the React application and the API.

## API

### Health check

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "geminiConfigured": true
}
```

### Analyze a maintenance report

```http
POST /api/intake/analyze
Content-Type: application/json
```

Request body:

```json
{
  "description": "The conveyor on Packaging Line 2 stopped and there appears to be oil beneath the motor."
}
```

The endpoint returns schema-validated work-request fields for review.

## Available commands

```bash
npm run dev
```

Runs the Vite development server and Express API together.

```bash
npm run dev:client
```

Runs only the Vite frontend.

```bash
npm run dev:server
```

Runs only the Express backend with file watching.

```bash
npm run build
```

Creates the production React build in `dist`.

```bash
npm start
```

Starts the production Express server.

```bash
npm run preview
```

Previews the Vite build without the production Express API.

## Render deployment

Create a Render Web Service connected to the GitHub repository.

Use:

```text
Build command:
npm install --include=dev && npm run build

Start command:
npm start
```

Add the following environment variables through the Render dashboard:

```text
GEMINI_API_KEY
GEMINI_MODEL
```

Render supplies the `PORT` environment variable automatically.

Do not upload the local `.env` file.

## Security and reliability approach

The prototype includes several controls:

- Gemini API key remains on the server.
- Browser code never receives the API key.
- Request length is limited.
- Gemini output is parsed and schema-validated.
- Only permitted categories and priority values are accepted.
- Unknown information should remain blank instead of being invented.
- Safety language is checked separately from Gemini.
- Human verification is required before preparing the record.

A production implementation would additionally require:

- Authentication
- Role-based access control
- Rate limiting
- Audit logging
- Secure data storage
- Privacy and retention policies
- Customer-specific asset and priority rules
- Monitoring and error reporting

## Current limitations

This project is a focused proof-of-concept.

It currently:

- Uses fictional maintenance data
- Does not connect to DirectLine
- Does not create a real CMMS work order
- Does not store records in a database
- Does not include user authentication
- Does not know a facility's real asset hierarchy
- Does not replace a maintenance planner
- Has not been evaluated with real CMMS customers

The suggested priority is a starting point for human review, not an operational authorization.

## Potential integration direction

If the concept were validated, a future implementation could:

1. Map prepared fields to an approved CMMS data model.
2. Load customer-specific locations and assets.
3. Apply configured priority and criticality rules.
4. Authenticate users through the existing platform.
5. Send the reviewed payload through an approved API.
6. Record the original report, prepared values and human changes.
7. Measure completion time, corrections and request quality.

These are possible future directions, not current capabilities.

## Purpose of the project

This project was created to demonstrate:

- Requirements analysis
- React interface development
- Node and Express API development
- Third-party API integration
- Structured-data validation
- Error handling
- Safety-aware business rules
- Human-in-the-loop application design
- Understanding of CMMS work-request workflows

## Disclaimer

This is an independent educational and portfolio concept created by Bharath Gopalsamy.

It is not affiliated with, endorsed by or connected to Megamation Systems Inc. or its DirectLine product. All examples use fictional maintenance data. DirectLine and Megamation are referenced only to describe the workflow context that inspired the project.

## Author

**Bharath Gopalsamy**

Master of Applied Computer Science graduate  
Application Developer and Application Support professional

- GitHub: [bharathgopalswamy](https://github.com/bharathgopalswamy)
- LinkedIn: [Bharath Gopalsamy](https://www.linkedin.com/in/bharathgopalsamy/)
