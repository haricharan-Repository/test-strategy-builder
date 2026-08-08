# Test Strategy Builder (TypeScript)

A TypeScript tool with both CLI and web UI support for generating an Excel-based test strategy from a requirement description.

## What it does

- Parses requirement text for feature areas, roles, actions, and constraints
- Builds core scenarios, edge cases, negative tests, and additional test coverage
- Automatically categorizes test cases by feature area
- Provides a browser UI for analysis, preview, and Excel download

## Setup

Install dependencies:

```bash
cd /Users/haricharanboganatham/Desktop/Code/TestStrategy Building Agent
npm install
```

## Run the web UI

Start the backend API server and the frontend separately.

```bash
npm run server
npm run dev
```

Then open the displayed Vite URL in your browser.

### Environment variables

If you want the tool to use OpenAI for richer extraction and test case generation, set:

```bash
export OPENAI_API_KEY="your-openai-key"
```

For Figma URL extraction, optionally set:

```bash
export FIGMA_API_TOKEN="your-figma-personal-access-token"
```

If no OpenAI key is provided, the tool will still work using a local parser fallback.

## Build for production

```bash
npm run build
```

## Use the CLI

```bash
npm run cli -- --requirement sample_requirement.txt --output test_strategy.xlsx
```

## Excel output

The generated workbook includes:

- `Requirement Summary` with parsed analysis data
- `Test Strategy` with feature area categorization and test cases
