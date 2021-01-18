import { mkdir, readFile, writeFile } from 'fs/promises';
import mjml2html from 'mjml';
import { join } from 'path';
import {
  prepareMjmlEnv,
  measure,
  ProjectConfig,
  CodeProcessor,
  Template,
} from '@fransvilhelm/mjml-sendgrid-toolkit-core';

export interface BuildResult {
  name: string;
  sourcePath: string;
  distPath: string;
  size: number;
  duration: number;
}

export async function build(project: ProjectConfig): Promise<BuildResult[]> {
  await prepareMjmlEnv(project);
  await ensureDirectory('dist', project);

  let results: BuildResult[] = [];

  for (let template of project.templates) {
    let [duration, result] = await measure(async () => {
      let distPath = project.resolve(join('dist', `${template.name}.html`));
      let sourcePath = project.resolve(template.template);

      let html = await buildTemplate(template, project);
      await writeFile(distPath, html);

      return {
        sourcePath,
        distPath,
        size: Buffer.byteLength(Buffer.from(html)),
      };
    });

    results.push({ ...result, name: template.name, duration });
  }

  return results;
}

export async function buildTemplate(
  template: Template,
  project: ProjectConfig,
): Promise<string> {
  let sourcePath = project.resolve(template.template);
  let mjml = await readFile(sourcePath, 'utf-8');
  let source = await processCode(mjml, {
    template,
    project,
    pipe: project.preprocessors,
  });

  let { html } = mjml2html(source, {
    filePath: sourcePath,
    validationLevel: 'strict',
    ...(project.mjmlConfigPath
      ? { mjmlConfigPath: project.mjmlConfigPath }
      : null),
  });

  return processCode(html, {
    template,
    project,
    pipe: project.postprocessors,
  });
}

async function ensureDirectory(
  directoryPath: string,
  project: ProjectConfig,
): Promise<void> {
  let exists = await project.exists(directoryPath);
  if (!exists) {
    let fullPath = project.resolve(directoryPath);
    await mkdir(fullPath, { recursive: true });
  }
}

export interface ProcessCodeOptions {
  template: Template;
  project: ProjectConfig;
  pipe: CodeProcessor[];
}

async function processCode(
  code: string,
  { template, pipe, project }: ProcessCodeOptions,
): Promise<string> {
  for (let handler of pipe) {
    code = await handler(code, template, project);
  }

  return code;
}
