import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { parseRequirement, generateTestCases, RequirementAnalysis, TestCase } from './src/lib/analysis.js';
import { workbookToBuffer } from './src/lib/testStrategy.js';
import { buildEnterpriseStrategy, EnterpriseTestStrategy } from './src/lib/enterpriseStrategy.js';
import ExcelJS from 'exceljs';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN || '';
const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');

app.use(cors());
app.use(express.json());

type HistoryEntry = {
  id: string;
  createdAt: string;
  sourceType: string;
  sourcePreview: string;
  sourceText: string;
  llmResult: { analysis: RequirementAnalysis; testCases: TestCase[] };
  fallback: boolean;
};

function extractFileText(fileName: string, buffer: Buffer): Promise<string> {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.xlsx' || extension === '.xls') {
    return extractExcelText(buffer);
  }
  if (extension === '.docx') {
    return extractDocxText(buffer);
  }
  if (extension === '.pdf') {
    return extractPdfText(buffer);
  }
  if (extension === '.json' || extension === '.txt' || extension === '.md') {
    return Promise.resolve(buffer.toString('utf8'));
  }
  return Promise.resolve(buffer.toString('utf8'));
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  const workbook = new (await import('exceljs')).Workbook();
  const normalizedBuffer = Buffer.from(buffer as Uint8Array);
  await workbook.xlsx.load(normalizedBuffer as any);
  const rows: string[] = [];
  workbook.eachSheet((sheet) => {
    rows.push(`Sheet: ${sheet.name}`);
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values)
        ? row.values
        : Object.values(row.values || {});
      const rowValues = values
        .map((value) => (value == null ? '' : String(value)))
        .join(' | ');
      rows.push(rowValues);
    });
    rows.push('');
  });
  return rows.join('\n');
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}

function extractFigmaKey(url: string): string | null {
  const idMatch = url.match(/figma\.com\/file\/([A-Za-z0-9]+)\//i);
  return idMatch ? idMatch[1] : null;
}

async function extractFigmaText(url: string, token: string): Promise<string> {
  const key = extractFigmaKey(url);
  if (!key) {
    throw new Error('Could not parse Figma file key from the URL.');
  }

  const response = await fetch(`https://api.figma.com/v1/files/${key}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const nodes: string[] = [];

  function walk(node: any) {
    if (!node) return;
    if (typeof node === 'object') {
      if (typeof node.name === 'string') {
        nodes.push(node.name);
      }
      if (typeof node.characters === 'string') {
        nodes.push(node.characters);
      }
      for (const value of Object.values(node)) {
        walk(value);
      }
    }
  }

  walk(data.document);
  return [`Figma file: ${data.name}`, ...nodes].join('\n');
}

async function callOpenAI(sourceText: string): Promise<any> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const systemMessage = `You are a product test strategy assistant. Analyze the requirement content and generate a structured JSON result containing requirement analysis and test cases. Do not include any markdown formatting.`;
  const userMessage = `Source text:\n${sourceText}\n\nReturn JSON with exactly two keys: analysis and testCases. analysis must include featureAreas, roles, actions, constraints, keywords, and featurePhrases. testCases must be an array of objects with fields featureArea, category, title, description, inputs, expectedResult, priority, and notes.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}: ${body}`);
  }

  const completion = await response.json();
  const raw = completion.choices?.[0]?.message?.content ?? '';
  const extracted = extractJson(raw);
  if (!extracted) {
    throw new Error('Unable to parse JSON from LLM response.');
  }
  return extracted;
}

function extractJson(text: string): any | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const jsonText = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

async function ensureHistoryDirectory(): Promise<void> {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
}

async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await ensureHistoryDirectory();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function makePreview(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned;
}

async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): Promise<void> {
  const history = await loadHistory();
  const next: HistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  history.unshift(next);
  await saveHistory(history.slice(0, 50));
}

async function getSourceText(req: express.Request): Promise<{ sourceText: string; sourceType: string }> {
  const sourceType = String(req.body.sourceType || 'text');
  if (sourceType === 'figma') {
    const figmaUrl = String(req.body.figmaUrl || '');
    const figmaToken = String(req.body.figmaToken || FIGMA_API_TOKEN);
    if (!figmaUrl) {
      throw new Error('Figma URL is required.');
    }
    if (!figmaToken) {
      throw new Error('Figma API token is required. Set FIGMA_API_TOKEN or provide it in the form.');
    }
    return { sourceText: await extractFigmaText(figmaUrl, figmaToken), sourceType };
  }

  if (sourceType === 'file') {
    if (!req.file) {
      throw new Error('A file upload is required for file source type.');
    }
    return { sourceText: await extractFileText(req.file.originalname, req.file.buffer), sourceType };
  }

  const sourceText = String(req.body.textInput || '').trim();
  if (!sourceText) {
    throw new Error('Text input is required for text source type.');
  }
  return { sourceText, sourceType };
}

app.post('/api/generate', upload.single('file'), async (req, res) => {
  try {
    const { sourceText, sourceType } = await getSourceText(req);

    let llmResult: { analysis: RequirementAnalysis; testCases: TestCase[] } | null = null;
    let llmError: Error | null = null;

    if (OPENAI_API_KEY) {
      try {
        llmResult = await callOpenAI(sourceText);
      } catch (error: any) {
        llmError = error;
        console.warn('OpenAI fallback:', error?.message || error);
      }
    }

    const result = llmResult ?? {
      analysis: parseRequirement(sourceText),
      testCases: generateTestCases(sourceText),
    };
    const fallback = !llmResult;

    await addHistoryEntry({
      sourceType,
      sourcePreview: makePreview(sourceText),
      sourceText,
      llmResult: result,
      fallback,
    });

    return res.json({ sourceText, llmResult: result, fallback, warning: llmError ? llmError.message : undefined });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
});

app.post('/api/export', upload.single('file'), async (req, res) => {
  try {
    const sourceType = String(req.body.sourceType || 'text');
    let analysis: RequirementAnalysis | undefined;
    let testCases: TestCase[] | undefined;

    if (req.body.analysis) {
      analysis = JSON.parse(String(req.body.analysis));
    }
    if (req.body.testCases) {
      testCases = JSON.parse(String(req.body.testCases));
    }

    let sourceText = analysis?.requirement ?? '';
    if (!analysis || !testCases) {
      const source = await getSourceText(req);
      sourceText = source.sourceText;
    }

    const buffer = await workbookToBuffer(sourceText, analysis, testCases);
    const result = analysis && testCases
      ? { analysis, testCases }
      : { analysis: parseRequirement(sourceText), testCases: generateTestCases(sourceText) };
    const fallback = !req.body.analysis || !req.body.testCases;

    await addHistoryEntry({
      sourceType,
      sourcePreview: makePreview(sourceText),
      sourceText,
      llmResult: result,
      fallback,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="test_strategy_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected export error.' });
  }
});

app.get('/api/history', async (_req, res) => {
  try {
    const history = await loadHistory();
    return res.json(history.slice(0, 20));
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load history.' });
  }
});

app.post('/api/enterprise-strategy', upload.single('file'), async (req, res) => {
  try {
    const projectName = String(req.body.projectName || `Project-${Date.now()}`);
    const { sourceText, sourceType } = await getSourceText(req);

    let llmResult: { analysis: RequirementAnalysis; testCases: TestCase[] } | null = null;
    let llmError: Error | null = null;

    if (OPENAI_API_KEY) {
      try {
        llmResult = await callOpenAI(sourceText);
      } catch (error: any) {
        llmError = error;
        console.warn('OpenAI fallback:', error?.message || error);
      }
    }

    const result = llmResult ?? {
      analysis: parseRequirement(sourceText),
      testCases: generateTestCases(sourceText),
    };

    const enterpriseStrategy = buildEnterpriseStrategy(
      projectName,
      sourceText,
      result.analysis,
      result.testCases,
    );

    return res.json(enterpriseStrategy);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected error generating enterprise strategy.' });
  }
});

app.post('/api/export-enterprise-strategy', async (req, res) => {
  try {
    const { strategy, testCases } = req.body;

    if (!strategy) {
      return res.status(400).json({ error: 'No enterprise strategy provided.' });
    }

    // Create workbook with strategy and test cases
    const workbook = new ExcelJS.Workbook();

    // Add Enterprise Strategy sheet
    const strategySheet = workbook.addWorksheet('Enterprise Strategy');
    strategySheet.columns = [
      { header: 'Section', key: 'section', width: 30 },
      { header: 'Details', key: 'details', width: 60 },
    ];

    const rows = [
      { section: 'Document Owner', details: strategy.documentInfo.documentOwner },
      { section: 'Version', details: strategy.documentInfo.version },
      { section: 'Status', details: strategy.documentInfo.status },
      { section: 'Last Updated', details: strategy.documentInfo.lastUpdated },
      { section: 'Target Audience', details: strategy.documentInfo.targetAudience.join('; ') },
      { section: '', details: '' },
      { section: 'Executive Summary', details: strategy.executiveSummary.overview },
      { section: 'Core Objectives', details: strategy.executiveSummary.coreObjectives.join('\n') },
      { section: '', details: '' },
      { section: 'In Scope', details: strategy.scope.inScope.join('\n') },
      { section: 'Out of Scope', details: strategy.scope.outOfScope.join('\n') },
      { section: '', details: '' },
      { section: 'Shift Left Strategy', details: strategy.methodology.shiftLeftStrategy.join('\n') },
      { section: 'Testing Levels', details: strategy.methodology.testingLevels.join('\n') },
      { section: 'Automation Strategy', details: strategy.methodology.automationStrategy.join('\n') },
    ];

    strategySheet.addRows(rows);

    // Add Quality Standards sheet
    const qualitySheet = workbook.addWorksheet('Quality Standards');
    qualitySheet.columns = [
      { header: 'Standard Category', key: 'category', width: 30 },
      { header: 'Target', key: 'target', width: 30 },
      { header: 'Measurement', key: 'measurement', width: 40 },
    ];
    
    if (strategy.qualityStandards.standards) {
      qualitySheet.addRows(strategy.qualityStandards.standards);
    }

    // Add Risk Profile sheet
    const riskSheet = workbook.addWorksheet('Risk Profile');
    riskSheet.columns = [
      { header: 'Risk', key: 'risk', width: 30 },
      { header: 'Impact', key: 'impact', width: 20 },
      { header: 'Mitigation', key: 'mitigation', width: 40 },
    ];
    
    if (strategy.riskProfile.risks) {
      riskSheet.addRows(strategy.riskProfile.risks);
    }

    // Add Governance sheet
    const govSheet = workbook.addWorksheet('Governance');
    govSheet.columns = [
      { header: 'Role', key: 'role', width: 25 },
      { header: 'Responsibilities', key: 'responsibilities', width: 50 },
    ];
    
    if (strategy.governance.roles) {
      govSheet.addRows(strategy.governance.roles);
    }

    // Add Test Cases sheet
    if (testCases && testCases.length > 0) {
      const testSheet = workbook.addWorksheet('Test Cases');
      testSheet.columns = [
        { header: 'Feature Area', key: 'featureArea', width: 20 },
        { header: 'Category', key: 'category', width: 25 },
        { header: 'Test Case', key: 'testCase', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Priority', key: 'priority', width: 12 },
      ];
      testSheet.addRows(testCases);
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="enterprise-strategy-${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected error exporting enterprise strategy.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Test strategy server listening on http://localhost:${PORT}`);
});
