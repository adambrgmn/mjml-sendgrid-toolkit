const concurrently = require('concurrently');

(async () => {
  let prefix = '@fransvilhelm/mjml-sendgrid-toolkit';
  try {
    await concurrently([
      {
        name: 'build',
        command: `yarn workspace ${prefix}-build run dev`,
      },
      {
        name: 'cli',
        command: `yarn workspace ${prefix} run dev`,
      },
      {
        name: 'core',
        command: `yarn workspace ${prefix}-core run dev`,
      },
      {
        name: 'dev',
        command: `yarn workspace ${prefix}-dev run dev`,
      },
      {
        name: 'format',
        command: `yarn workspace ${prefix}-format run dev`,
      },
      {
        name: 'lint',
        command: `yarn workspace ${prefix}-lint run dev`,
      },
    ]);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
