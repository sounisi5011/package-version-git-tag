import slugify from '@sindresorhus/slugify';
import path from 'path';

import { TEST_TMP_DIR } from './const.js';

const createdTmpDirSet = new Set<string>();
export function tmpDir(...uniqueNameList: (string | undefined)[]): string {
    const uniqueName = slugify(
        uniqueNameList.map((name) => name ?? '').join(' ') || 'test',
    );
    let dirname: string = uniqueName;
    for (let i = 2; createdTmpDirSet.has(dirname); i++) {
        dirname = `${uniqueName}_${i}`;
    }
    createdTmpDirSet.add(dirname);
    return path.resolve(TEST_TMP_DIR, dirname);
}
