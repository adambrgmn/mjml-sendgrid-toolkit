import { lint } from '@fransvilhelm/mjml-sendgrid-toolkit-lint';
import { getProjectConfig } from '@fransvilhelm/mjml-sendgrid-toolkit-core';

(async () => {
  let projectConfig = await getProjectConfig(process.cwd());
  console.log(projectConfig);
})();
