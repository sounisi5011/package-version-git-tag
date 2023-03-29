import path from 'path';

export const TEST_ROOT = path.resolve(__dirname, '..');
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
