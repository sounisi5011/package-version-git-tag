import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const symlinkAsync = promisify(fs.symlink);

export const writeFile = promisify(fs.writeFile);

export async function createSymlink({
    symlinkPath,
    linkTarget,
}: {
    symlinkPath: string;
    linkTarget: string;
}): Promise<void> {
    const symlinkFullpath = path.resolve(symlinkPath);
    const symlinkTargetPath = path.isAbsolute(linkTarget)
        ? path.relative(path.dirname(symlinkFullpath), linkTarget)
        : linkTarget;
    await symlinkAsync(symlinkTargetPath, symlinkFullpath);
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

export async function setEnv(
    envs: typeof process.env,
    callback: () => void | Promise<void>,
): Promise<void> {
    const origMap = new Map<string, typeof envs[string] | null>();
    try {
        const envKeys = Object.keys(process.env);
        Object.entries(envs).forEach(([overwriteKey, newValue]) => {
            const overwriteLKey = overwriteKey.toLowerCase();
            const foundKey = envKeys.find(
                key => key.toLowerCase() === overwriteLKey,
            );
            if (foundKey !== undefined) {
                origMap.set(foundKey, process.env[foundKey]);
                process.env[foundKey] = newValue;
            } else {
                origMap.set(overwriteKey, null);
                process.env[overwriteKey] = newValue;
            }
        });

        await callback();
    } finally {
        origMap.forEach((origValue, key) => {
            if (origValue !== null) {
                process.env[key] = origValue;
            } else {
                delete process.env[key];
            }
        });
    }
}
