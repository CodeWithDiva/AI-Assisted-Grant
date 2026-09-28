import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The API's version from its package.json. Read from disk rather than npm_package_version,
 * which is only set when the process is started through a package script (not in Docker).
 */
export const APP_VERSION: string = (() => {
  try {
    // src/config and dist/config both sit two levels below apps/api.
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
})();
