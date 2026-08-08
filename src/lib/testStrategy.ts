import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { generateTestCases, parseRequirement, RequirementAnalysis, TestCase } from './analysis.js';

function adjustColumnWidths(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns?.forEach((column) => {
    if (!column) {
      return;
    }

    const values = column.values ?? [];
    const maxLength = values
      .map((value) => {
        if (typeof value === 'string') {
          return value.length;
        }
        return String(value).length;
      })
      .reduce((max, length) => Math.max(max, length), 0);

    column.width = Math.min(Math.max(maxLength + 2, 10), 70);
  });
}

function ensureOutputDirectory(outputPath: string): void {
  const directory = path.dirname(outputPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export async function buildWorkbook(
  requirement: string,
  analysis?: RequirementAnalysis,
  cases?: TestCase[],
): Promise<ExcelJS.Workbook> {
  const finalAnalysis = analysis ?? parseRequirement(requirement);
  const finalCases = cases ?? generateTestCases(requirement);
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Requirement Summary');

  summarySheet.addRow(['Requirement Text', finalAnalysis.requirement]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Feature Areas', finalAnalysis.featureAreas.join(', ')]);
  summarySheet.addRow(['Extracted Keywords', finalAnalysis.keywords.join(', ')]);
  summarySheet.addRow(['Roles', finalAnalysis.roles.join(', ')]);
  summarySheet.addRow(['Actions', finalAnalysis.actions.join(', ')]);
  summarySheet.addRow(['Constraints', finalAnalysis.constraints.join(', ')]);
  summarySheet.addRow(['Feature Phrases', finalAnalysis.featurePhrases.join(', ')]);

  const strategySheet = workbook.addWorksheet('Test Strategy');
  strategySheet.addRow([
    'Feature Area',
    'Category',
    'Test Case',
    'Description',
    'Inputs',
    'Expected Result',
    'Priority',
    'Notes',
  ]);

  for (const testCase of finalCases) {
    strategySheet.addRow([
      testCase.featureArea,
      testCase.category,
      testCase.title,
      testCase.description,
      testCase.inputs,
      testCase.expectedResult,
      testCase.priority,
      testCase.notes,
    ]);
  }

  adjustColumnWidths(summarySheet);
  adjustColumnWidths(strategySheet);

  return workbook;
}

export async function writeExcel(requirement: string, outputFile: string): Promise<void> {
  const workbook = await buildWorkbook(requirement);
  ensureOutputDirectory(outputFile);
  await workbook.xlsx.writeFile(outputFile);
}

export async function workbookToBuffer(
  requirement: string,
  analysis?: RequirementAnalysis,
  cases?: TestCase[],
): Promise<Buffer> {
  const workbook = await buildWorkbook(requirement, analysis, cases);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
