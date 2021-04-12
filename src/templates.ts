import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import { join } from 'path';

export function getHtmlTemplates() {
  const readFile = (name: string) => {
    return readFileSync(join(__dirname, './templates', name), 'utf-8');
  };

  return {
    list: Handlebars.compile(readFile('list.hbs')),
    notFound: Handlebars.compile(readFile('not-found.hbs')),
    error: Handlebars.compile(readFile('error.hbs')),
  };
}
