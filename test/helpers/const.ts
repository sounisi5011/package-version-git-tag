import path from 'node:path';
import url from 'node:url';

// Note: Path resolution using the "new URL()" constructor is incomplete (for example, trailing slashes in paths are not removed).
//       So here we will use both the "new URL()" constructor and the "path.resolve()" function.
export const TEST_ROOT = path.resolve(
    url.fileURLToPath(new URL('..', import.meta.url)),
);
export const PROJECT_ROOT = path.resolve(TEST_ROOT, '..');

export const TEST_FIXTURES_DIR = path.resolve(TEST_ROOT, 'fixtures');
export const TEST_TMP_DIR = path.resolve(TEST_ROOT, '.temp');

/**
 * @see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
 */
export const COREPACK_HOME = path.resolve(TEST_TMP_DIR, '.corepack');

export const TINY_NPM_PACKAGE = path.join(
    TEST_FIXTURES_DIR,
    'tiny-npm-package.tgz',
);
