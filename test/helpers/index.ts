import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import { promisify } from 'util';

const symlinkAsync = promisify(fs.symlink);

export { execFileAsync } from '../../src/utils';

export const writeFile = promisify(fs.writeFile);

export async function createSymlink({
    symlinkPath,
    linkTarget,
}: {
    symlinkPath: string;
    linkTarget: string;
}): Promise<void> {
    const symlinkFullpath = path.resolve(symlinkPath);
    const symlinkDirFullpath = path.dirname(symlinkFullpath);
    const symlinkTargetPath = path.isAbsolute(linkTarget)
        ? path.relative(symlinkDirFullpath, linkTarget)
        : linkTarget;

    await makeDir(symlinkDirFullpath);
    await symlinkAsync(symlinkTargetPath, symlinkFullpath);
}

export function replaceParentDirPath(
    targetPath: string,
    parentDirPath: { from: string; to: string },
): string {
    return path.join(
        parentDirPath.to,
        path.relative(parentDirPath.from, targetPath),
    );
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
