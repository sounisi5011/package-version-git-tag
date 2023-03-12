import type { PathLike } from 'fs';
import * as fs from 'fs/promises';

export { execFileAsync } from '../../src/utils';

export const rmrf: (path: PathLike) => Promise<void> =
    'rm' in fs
        ? async (path) => fs.rm(path, { recursive: true, force: true })
        : async (path) => fs.rmdir(path, { recursive: true });

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
