import { dirname } from 'path';
import readPkgUp, { NormalizedPackageJson } from 'read-pkg-up';

export interface ProjectConfig {
  projectRoot: string;
  packageJson: NormalizedPackageJson;
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

  return {
    projectRoot: dirname(result.path),
    packageJson: result.packageJson,
  };
}
