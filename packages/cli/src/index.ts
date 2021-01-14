/* eslint-disable @typescript-eslint/no-unused-expressions */
import yargs from 'yargs';
import {
  lint,
  formatLintResult,
} from '@fransvilhelm/mjml-sendgrid-toolkit-lint';
import { getProjectConfig } from '@fransvilhelm/mjml-sendgrid-toolkit-core';

interface LintArgs {
  files: string[];
}

yargs(process.argv.slice(2))
  .command(
    'build',
    'Build email templates from MJML source',
    () => {},
    (argv) => console.log('In development'),
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
    (yargs) => {
      yargs.positional('files', {
        describe: 'MJML files to lint',
        type: 'string',
      });
    },
    async (argv) => {
      let project = await getProjectConfig(process.cwd());
      let result = await lint(argv.files, project);
      let output = await formatLintResult(result);

      if (output.length > 0) {
        console.log(output);
        process.exit(1);
      } else {
        process.exit(0);
      }
    },
  )
  .command(
    'format',
    'Format MJML templates with prettier',
    () => {},
    (argv) => console.log('In development'),
  ).argv;