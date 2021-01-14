import { isAbsolute, resolve, join, extname } from 'path';
import { constants } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import { uniqWith, isEqual } from 'lodash';
import mjml from 'mjml';
import {
  MJMLParseError,
  components,
  initializeType,
  MJMLJsonObject,
} from 'mjml-core';
import MJMLParser from 'mjml-parser-xml';
import MJMLValidator, { dependencies } from 'mjml-validator';
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

  // We need to warm-up mjml to register all built-in components
  mjml('<mjml><mj-body></mj-body></mjml>');

  for (let originalPath of filePaths) {
    let filePath = isAbsolute(originalPath)
      ? originalPath
      : resolve(project.projectRoot, originalPath);

    try {
      if (!(await exists(filePath))) {
        throw new Error('File does not exists.');
      }

      if (extname(filePath).toLowerCase() !== '.mjml') {
        throw new Error('Given file is not an MJML-file.');
      }

      let content = await readFile(filePath, 'utf-8');
      let tree = MJMLParser(content, { components, filePath });
      let errors = MJMLValidator(tree, {
        components,
        dependencies,
        initializeType,
      });

      if (errors.length > 0) {
        results.push(...splitErrors(filePath, errors, tree));
      }
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

  let grouped: LintResult[] = [];
  for (let result of results) {
    let existing = grouped.find((res) => res.filePath === result.filePath);
    if (existing) {
      existing.errors.push(...result.errors);
    } else {
      grouped.push(result);
    }
  }

  for (let group of grouped) {
    group.errors = uniqWith(group.errors, (a, b) => {
      return (
        a.line === b.line && a.tagName === b.tagName && a.message === b.message
      );
    });
  }

  await debug('group.json', JSON.stringify(grouped, null, 2));

  return grouped;
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}

async function debug(fileName: string, content: string) {
  await writeFile(join(process.cwd(), fileName), content);
}

function splitErrors(
  filePath: string,
  errors: MJMLParseError[],
  tree: MJMLJsonObject,
): LintResult[] {
  let grouped: Record<string, MJMLParseError[]> = {};

  for (let error of errors) {
    if (error.formattedMessage.includes('included at line')) {
      let originFilePath =
        findOriginFilePath(filePath, error, tree) ?? filePath;
      grouped[originFilePath] = grouped[originFilePath] ?? [];
      grouped[originFilePath].push(error);
    } else {
      grouped[filePath] = grouped[filePath] ?? [];
      grouped[filePath].push(error);
    }
  }

  return Object.entries(grouped).map(([filePath, errors]) => ({
    filePath,
    errors,
  }));
}

function findOriginFilePath(
  filePath: string,
  error: MJMLParseError,
  tree: MJMLJsonObject,
): string | null {
  if ('children' in tree) {
    for (let child of tree.children) {
      if (
        (child as any).absoluteFilePath !== filePath &&
        (child as any).line === error.line &&
        child.tagName === error.tagName
      ) {
        return (child as any).absoluteFilePath as string;
      }

      let next = findOriginFilePath(filePath, error, child);
      if (next != null) return next;
    }
  }

  return null;
}
