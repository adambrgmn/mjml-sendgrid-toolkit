/* eslint-disable @typescript-eslint/no-unused-expressions */
import yargs from 'yargs';
import ora from 'ora';
import chalk from 'chalk';
import figures from 'figures';
import prettyBytes from 'pretty-bytes';
import {
  getProjectConfig,
  measure,
} from '@fransvilhelm/mjml-sendgrid-toolkit-core';
import {
  lint,
  formatLintResult,
} from '@fransvilhelm/mjml-sendgrid-toolkit-lint';
import {
  format,
  FormatResult,
} from '@fransvilhelm/mjml-sendgrid-toolkit-format';
import { build } from '@fransvilhelm/mjml-sendgrid-toolkit-build';

yargs(process.argv.slice(2))
  .command(
    'build',
    'Build email templates from MJML source',
    buildBuilder,
    buildHandler,
  )
  .command(
    'dev',
    'Start dev server with live updated templates',
    () => {},
    argv => console.log('In development'),
  )
  .command(
    'send',
    'Send test emails through the Sendgrid api',
    () => {},
    argv => console.log('In development'),
  )
  .command<LintArgs>(
    'lint <files..>',
    'Lint MJML files',
    lintBuilder,
    lintHandler,
  )
  .command<FormatArgs>(
    'format <files..>',
    'Format MJML templates with prettier',
    formatBuilder,
    formatHandler,
  ).argv;

interface BuildArgs {}

function buildBuilder(yargs: yargs.Argv) {}

async function buildHandler(argv: yargs.Arguments<BuildArgs>) {
  let spinner = ora('Building templates').start();

  try {
    let project = await getProjectConfig(process.cwd(), 'prod');
    let results = await build(project);

    spinner.succeed(`Templates compiled\n`);

    for (let result of results) {
      let name = chalk.bold.green(result.name);
      let src = chalk.blue(project.relative(result.sourcePath));
      let dist = chalk.blue(project.relative(result.distPath));
      let size = prettyBytes(result.size);
      let dur = result.duration.toFixed(2) + ' ms';

      console.log(
        `${name}: ${src} ${figures.arrowRight} ${dist}
  ${chalk.gray(`Size: ${size} | Duration: ${dur}`)}\n`,
      );
    }
  } catch (error) {
    spinner.fail('Failed to build templates');
    console.error(error);
  }
}

interface LintArgs {
  files: string[];
}

function lintBuilder(yargs: yargs.Argv) {
  yargs.positional('files', {
    describe: 'MJML files to lint',
    type: 'string',
  });
}

async function lintHandler(argv: yargs.Arguments<LintArgs>) {
  let project = await getProjectConfig(process.cwd(), 'dev');
  let result = await lint(argv.files, project);
  let output = await formatLintResult(result);

  if (output.length > 0) {
    console.log(output);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

interface FormatArgs {
  files: string[];
}

function formatBuilder(yargs: yargs.Argv) {
  yargs.positional('files', {
    describe: 'MJML files to format',
    type: 'string',
  });
}

async function formatHandler(argv: yargs.Arguments<FormatArgs>) {
  let spinner = ora({ text: 'Formatting files' });
  spinner.start();

  try {
    let project = await getProjectConfig(process.cwd(), 'dev');
    let result = await format(argv.files, project);

    spinner.succeed('Files formatted\n');

    for (let { filePath, action } of result) {
      let icon: string;
      let textColor: chalk.Chalk;

      switch (action) {
        case 'changed':
          icon = chalk.green(figures.tick);
          textColor = chalk.green;
          break;
        case 'unchanged':
          icon = chalk.gray('-');
          textColor = chalk.white;
          break;
        case 'ignored':
          icon = chalk.yellow('-');
          textColor = chalk.gray;
          break;
        case 'error':
          icon = chalk.red(figures.cross);
          textColor = chalk.red;
      }

      console.log(icon, textColor(project.relative(filePath)));
    }

    let actions: Record<FormatResult['action'], number> = {
      changed: result.filter(res => res.action === 'changed').length,
      unchanged: result.filter(res => res.action === 'unchanged').length,
      ignored: result.filter(res => res.action === 'ignored').length,
      error: result.filter(res => res.action === 'error').length,
    };

    console.log(`
Ran formatter over ${result.length} file(s)
  ${actions.changed} file(s) updated
  ${actions.unchanged} file(s) untouched
  ${actions.ignored} file(s) ignored
  ${actions.error} file(s) errored
`);
    process.exit(actions.error > 0 ? 1 : 0);
  } catch (error) {
    spinner.fail(error.message);
    console.error(error);
    process.exit(1);
  }
}
