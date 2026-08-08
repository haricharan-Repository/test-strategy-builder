# Test Strategy Builder (TypeScript)

A TypeScript tool with both CLI and web UI support for generating an Excel-based test strategy from a requirement description.

Repository: https://github.com/haricharan-Repository/test-strategy-builder

## What it does

- Accepts requirements as pasted text, an uploaded file (`.txt`, `.md`, `.json`, `.docx`, `.pdf`, `.xlsx`/`.xls`), or a Figma file URL
- Parses requirement text for feature areas, roles, actions, and constraints
- Optionally uses OpenAI for richer extraction and test case generation, with an automatic local-parser fallback when no API key is set
- Generates 35+ categories of test cases (core scenarios, edge cases, negative tests, security, data, performance, accessibility, compatibility, and more)
- Automatically categorizes test cases by feature area
- Builds a full test plan and an enterprise-grade test strategy document (scope, methodology, quality standards, risk profile, governance)
- Provides a browser UI for analysis, preview, and Excel download
- Keeps a local history of recent generations

## Setup

Clone and install dependencies:

```bash
git clone https://github.com/haricharan-Repository/test-strategy-builder.git
cd test-strategy-builder
npm install
```

### Environment variables

If you want the tool to use OpenAI for richer extraction and test case generation, set:

```bash
export OPENAI_API_KEY="your-openai-key"
```

For Figma URL extraction, optionally set:

```bash
export FIGMA_API_TOKEN="your-figma-personal-access-token"
```

If no OpenAI key is provided, the tool still works using a local parser fallback.

The API server listens on port `4000` by default; override with `PORT`.

## Run the web UI

Easiest option — run the API server and the Vite frontend together:

```bash
npm run dev:full
```

Or start them separately in two terminals:

```bash
npm run server:dev
npm run dev
```

Then open the displayed Vite URL in your browser (proxies `/api` to `http://localhost:4000`).

## Use the CLI

```bash
npm run cli -- --requirement sample_requirement.txt --output test_strategy.xlsx
```

If `--requirement` is omitted, the CLI reads requirement text from stdin.

## Build for production

```bash
npm run build
npm start
```

`npm run build` compiles the React frontend (`dist/`) and the Express server + CLI (`dist-server/`). `npm start` builds and then serves the production frontend from the Express server.

## Excel output

The generated workbook includes:

- `Requirement Summary` with parsed analysis data
- `Test Strategy` with feature area categorization and test cases

The web UI can also export a separate **Enterprise Strategy** workbook with dedicated sheets for the strategy document, quality standards, risk profile, governance, and test cases.

## Project structure

```
server.ts                  Express API (generate, export, history, enterprise strategy)
src/index.ts                CLI entry point
src/lib/analysis.ts         Requirement parsing and test case generation
src/lib/testStrategy.ts     Standard Excel workbook builder
src/lib/enterpriseStrategy.ts  Enterprise test strategy builder
src/ui/                     React frontend (Vite)
```

Generated history (`data/history.json`) and output workbooks (`*.xlsx`) are local runtime artifacts and are not committed to the repository.
