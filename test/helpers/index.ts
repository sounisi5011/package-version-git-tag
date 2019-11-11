import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const symlinkAsync = promisify(fs.symlink);

export { execFileAsync } from '../../src/utils';

export const writeFile = promisify(fs.writeFile);
export const lchmod = promisify(
    // eslint-disable-next-line node/no-deprecated-api
    typeof fs.lchmod === 'function' ? fs.lchmod : fs.chmod,
);

export async function createSymlink({
    symlinkPath,
    linkTarget,
    mode,
}: {
    symlinkPath: string;
    linkTarget: string;
    mode?: number | string;
}): Promise<void> {
    const symlinkFullpath = path.resolve(symlinkPath);
    const symlinkTargetPath = path.isAbsolute(linkTarget)
        ? path.relative(path.dirname(symlinkFullpath), linkTarget)
        : linkTarget;
    await symlinkAsync(symlinkTargetPath, symlinkFullpath);
    if (mode !== undefined) {
        await lchmod(symlinkFullpath, mode);
    }
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
