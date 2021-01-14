import { isAbsolute, resolve, extname } from 'path';
import { constants } from 'fs';
import { readFile, access } from 'fs/promises';
import mjml from 'mjml';
import { MJMLParseError } from 'mjml-core';
import { ESLint } from 'eslint';
import { ProjectConfig } from '@fransvilhelm/mjml-sendgrid-toolkit-core';

interface LintResult {
  filePath: string;
  errors: MJMLParseError[];
}

export async function lint(
  filePaths: string[],
  project: ProjectConfig,
): Promise<LintResult[]> {
  let results: LintResult[] = [];

  for (let originalPath of filePaths) {
    let filePath = isAbsolute(originalPath)
      ? originalPath
      : resolve(project.projectRoot, originalPath);

    try {
      if (!(await exists(filePath))) {
        throw new Error(`File does not exists.`);
      }

      if (extname(filePath).toLowerCase() !== '.mjml') {
        throw new Error(`Given file is not an MJML-file.`);
      }

      let content = await readFile(filePath, 'utf-8');
      let { errors } = mjml(content, { filePath });

      if (errors.length > 0) results.push({ filePath, errors });
    } catch (error) {
      results.push({
        filePath,
        errors: [
          {
            line: 0,
            message: error.message,
            formattedMessage: error.message,
            tagName: 'error',
          },
        ],
      });
    }
  }

  return results;
}

export async function formatLintResult(results: LintResult[]): Promise<string> {
  let reports: ESLint.LintResult[] = [];

  for (let result of results) {
    reports.push({
      filePath: result.filePath,
      errorCount: result.errors.length,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
      usedDeprecatedRules: [],
      messages: result.errors.map((error) => ({
        severity: 2,
        fatal: true,
        ruleId: error.tagName,
        message: error.message,
        line: error.line,
        column: 0,
      })),
    });
  }

  let eslint = new ESLint({});
  let formatter = await eslint.loadFormatter();
  let output = formatter.format(reports);

  return output;
}

// severity: 2,
//           fatal: true,
//           ruleId: error.tagName,
//           message: error.message,
//           line: error.line,
//           column: 0,
//   results.push({
//     errorCount: errors.length,
//     warningCount: 0,
//     filePath,
//     messages,
//   });
// }
// }
// }

// let eslint = new ESLint();
// let formatter = await eslint.loadFormatter();
// let output = formatter.format(results);

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}
