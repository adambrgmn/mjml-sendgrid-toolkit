/* eslint-disable @typescript-eslint/no-unused-expressions */
import yargs from 'yargs';
import ora from 'ora';
import chalk from 'chalk';
import figures from 'figures';
import prettyBytes from 'pretty-bytes';
import {
  getProjectConfig,
  ProjectConfig,
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

(yargs(process.argv.slice(2)) as yargs.Argv<BaseArgs>)
  .middleware(getConfig)
  .option('mode', {
    choices: ['dev', 'prod'],
    description: 'Compile mode',
  })
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
    (argv) => console.log('In development'),
  )
  .command(
    'send',
    'Send test emails through the Sendgrid api',
    () => {},
    (argv) => console.log('In development'),
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

interface BaseArgs {
  mode?: 'prod' | 'dev';
  project: ProjectConfig;
}

async function getConfig(argv: yargs.Arguments<BaseArgs>) {
  let mode: 'dev' | 'prod' =
    argv.mode ?? argv._.includes('build') ? 'prod' : 'dev';

  argv.project = await getProjectConfig(process.cwd(), mode);
  return argv;
}

function buildBuilder(yargs: yargs.Argv) {
  yargs.option('mode', { choices: ['dev', 'prod'], default: 'prod' });
}

async function buildHandler(argv: yargs.Arguments<BaseArgs>) {
  let spinner = ora('Building templates').start();

  try {
    let { project } = argv;
    project.mode = argv.mode ?? 'prod';
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

interface LintArgs extends BaseArgs {
  files: string[];
}

function lintBuilder(yargs: yargs.Argv) {
  yargs.positional('files', {
    describe: 'MJML files to lint',
    type: 'string',
  });
}

async function lintHandler(argv: yargs.Arguments<LintArgs>) {
  let { project, files } = argv;
  let result = await lint(files, project);
  let output = await formatLintResult(result);

  if (output.length > 0) {
    console.log(output);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

interface FormatArgs extends BaseArgs {
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
    let { project, files } = argv;
    let result = await format(files, project);

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
      changed: result.filter((res) => res.action === 'changed').length,
      unchanged: result.filter((res) => res.action === 'unchanged').length,
      ignored: result.filter((res) => res.action === 'ignored').length,
      error: result.filter((res) => res.action === 'error').length,
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
