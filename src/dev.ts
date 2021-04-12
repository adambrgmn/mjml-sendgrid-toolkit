import bs from 'browser-sync';
import UrlPattern from 'url-pattern';

import { getProjectConfig, prepareMjmlEnv, ProjectConfig } from './core';
import { buildTemplate } from './build';
import { getHtmlTemplates } from './templates';

const templatePattern = new UrlPattern('/template/:name');

export function dev(project: ProjectConfig) {
  const server = bs.create('MST Server');

  server.watch('**/*.mjml', {}, () => server.reload());
  server.watch('**/*.json', {}, () => server.reload());
  for (let component of project.mjmlComponents) {
    server.watch(project.relative(component), {}, () => server.reload());
  }

  server.init({
    server: project.root,
    open: false,
    ui: false,
    logPrefix: 'mst',
    middleware: [
      {
        route: '/',
        handle: createTemplatesListHandler(project.root, project.mode),
      },
      createTemplateHandler(project.root, project.mode),
    ],
  });

  return () => server.exit();
}

function createTemplateHandler(
  projectRoot: string,
  mode: 'dev' | 'prod',
): bs.MiddlewareHandler {
  const render = getHtmlTemplates();

  return async function templateHandler(req, res, next) {
    let match = templatePattern.match(req.url ?? '/') as {
      name: string;
    } | null;

    if (match == null) return next();

    let templateName = match.name;
    let project = await getProjectConfig(projectRoot, mode);
    let currentTemplate = project.templates.find(
      (template) => template.name === templateName,
    );

    if (currentTemplate == null) {
      res.statusCode = 404;
      res.write(render.notFound({ template: { name: match.name } }));
      return res.end();
    }

    try {
      await prepareMjmlEnv(project);
      let code = await buildTemplate(currentTemplate, project);

      res.setHeader('Content-Type', 'text/html');
      res.write(code);
      res.end();
    } catch (error) {
      res.setHeader('Content-Type', 'text/html');
      res.write(render.error({ template: currentTemplate, error }));
      res.end();
    }
  };
}

function createTemplatesListHandler(
  projectRoot: string,
  mode: 'dev' | 'prod',
): bs.MiddlewareHandler {
  const render = getHtmlTemplates();

  return async function templatesListHandler(_, res) {
    let project = await getProjectConfig(projectRoot, mode);

    res.setHeader('Content-Type', 'text/html');
    res.write(render.list(project));
    res.end();
  };
}
