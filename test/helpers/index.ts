import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { execFileAsync } from '../../src/utils';

const symlinkAsync = promisify(fs.symlink);

export { execFileAsync } from '../../src/utils';

export const writeFile = promisify(fs.writeFile);

export async function createSymlink({
    symlinkPath,
    linkTarget,
    subProcess = false,
}: {
    symlinkPath: string;
    linkTarget: string;
    subProcess?: boolean;
}): Promise<void> {
    const symlinkFullpath = path.resolve(symlinkPath);
    const symlinkTargetPath = path.isAbsolute(linkTarget)
        ? path.relative(path.dirname(symlinkFullpath), linkTarget)
        : linkTarget;
    if (subProcess) {
        await execFileAsync('node', [
            '-e',
            "require('fs').symlinkSync(process.argv[1], process.argv[2])",
            symlinkTargetPath,
            symlinkFullpath,
        ]);
    } else {
        await symlinkAsync(symlinkTargetPath, symlinkFullpath);
    }
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
