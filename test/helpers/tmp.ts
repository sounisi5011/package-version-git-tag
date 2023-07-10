import path from 'node:path';

import slugify from '@sindresorhus/slugify';
import type * as vitest from 'vitest';

import { TEST_TMP_DIR } from './const.js';

function getTestNameList(
    meta: Readonly<vitest.Test | vitest.Suite> | undefined,
): string[] {
    if (!meta) return [];
    return getTestNameList(meta.suite).concat(meta.name);
}

const createdTmpDirSet = new Set<string>();

/**
 * Get the test name from the Vitest test context and create a temporary directory name.
 */
export function tmpDir(ctx: vitest.TestContext): string {
    const uniqueName = slugify(getTestNameList(ctx.meta).join(' ') || 'test');
    let dirname: string = uniqueName;
    for (let i = 2; createdTmpDirSet.has(dirname); i++) {
        dirname = `${uniqueName}_${i}`;
    }
    createdTmpDirSet.add(dirname);
    return path.resolve(TEST_TMP_DIR, dirname);
}
