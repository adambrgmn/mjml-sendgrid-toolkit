import { readFileSync } from 'fs';
import { basename, dirname, extname, resolve } from 'path';
import Handlebars from 'handlebars';
import {
  Template,
  ProjectConfig,
  CodeProcessor,
} from '@fransvilhelm/mjml-sendgrid-toolkit-core';

export const preprocessors: CodeProcessor[] = [handleHandlebars];
export const postprocessors: CodeProcessor[] = [removeRawTags];

export function inlineIncludes(
  code: string,
  template: Template,
  project: ProjectConfig,
) {
  function includePartials(src: string, basePath: string): string {
    let replacedCode = src.replace(
      /<mj-include path="([^"]*)" \/>/g,
      (_, includePath) => {
        let absolutePath = resolve(basePath, includePath);
        let content = readFileSync(absolutePath, 'utf-8');
        return includePartials(content, dirname(absolutePath));
      },
    );

    return replacedCode;
  }

  return includePartials(code, dirname(project.resolve(template.template)));
}

async function handleHandlebars(
  code: string,
  template: Template,
  project: ProjectConfig,
): Promise<string> {
  if (project.mode === 'prod') {
    let re = /\{\{\s*(#|\/|else).*\}\}/g;
    return code.replace(re, (match) => `<mj-raw>${match}</mj-raw>`);
  }

  let context = await project.readConfig<Record<string, any>>(
    [
      basename(template.template, extname(template.template)) + '.json',
      template.name + '.json',
      'data.json',
    ],
    dirname(project.resolve(template.template)),
  );

  if (project.mode === 'dev') {
    let hbs = Handlebars.compile(code);
    return hbs({ ...template, ...(context?.config ?? {}) });
  }

  return code;
}

function removeRawTags(code: string): string {
  return code.replace(/<mj-raw>/g, '').replace(/<\/mj-raw>/g, '');
}
