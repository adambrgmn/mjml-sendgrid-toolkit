import { dirname, isAbsolute, relative, resolve } from 'path';
import { constants } from 'fs';
import { access, readFile } from 'fs/promises';
import readPkgUp, { NormalizedPackageJson } from 'read-pkg-up';
import mjml2html from 'mjml';
import { registerComponent } from 'mjml-core';

export interface ProjectConfig {
  projectRoot: string;
  packageJson: NormalizedPackageJson;
  mjmlConfigPath: string | null;
  mjmlComponents: string[];
  /**
   * Resolve will build a file path relative from the project root.
   * @param filePath Path relative to project root that should be resolve
   */
  resolve(filePath: string): string;
  /**
   * Relative will make an absolute path relative to the project root.
   * @param filePath Path to transform into relative version from project root
   */
  relative(filePath: string): string;
  /**
   * Check if a given file path exists on the file system.
   * @param filePath File path to check if it exists
   */
  exists(filePath: string): Promise<boolean>;
}

/**
 * Get relevant project data in order to properly execute commands
 * @param cwd Current working directory
 */
export async function getProjectConfig(cwd: string): Promise<ProjectConfig> {
  let result = await readPkgUp({ cwd, normalize: true });

  if (result == null) {
    throw new Error('Could not read package.json.');
  }

  let projectRoot = dirname(result.path);
  let projectResolve = (filePath: string) => resolve(projectRoot, filePath);
  let projectRelative = (filePath: string) => relative(projectRoot, filePath);
  let projectExists = async (filePath: string) => {
    filePath = isAbsolute(filePath) ? filePath : projectResolve(filePath);
    try {
      await access(filePath, constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  };

  let mjmlConfigPath: string | null = projectResolve('.mjmlconfig');
  let mjmlComponents: string[] = [];

  if (await exists(mjmlConfigPath)) {
    let config = await readJson<{ packages?: string[] }>(mjmlConfigPath);
    for (let relPath of config.packages ?? []) {
      mjmlComponents.push(projectResolve(relPath));
    }
  } else {
    mjmlConfigPath = null;
  }

  return {
    projectRoot,
    packageJson: result.packageJson,
    mjmlConfigPath,
    mjmlComponents,
    resolve: projectResolve,
    relative: projectRelative,
    exists: projectExists,
  };
}

/**
 * To use custom components in MJML one needs to register them. This is often
 * taken care of for us when using the main export from mjml or mjml-core.
 * But e.g. the lint command uses other ways to get the result.
 * We therefor need to "warm up" the mjml environment by registering all
 * components and their dependencies.
 *
 * @param project Project data
 */
export async function prepareMjmlEnv(project: ProjectConfig) {
  mjml2html('<mjml><mj-body></mj-body></mjml>');
  for (let componentPath of project.mjmlComponents) {
    try {
      let { default: comp } = await import(componentPath);
      registerComponent(comp);
    } catch (error) {
      throw new Error(
        `Could not load custom component ${project.relative(componentPath)}`,
      );
    }
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  let content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}
