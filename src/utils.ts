import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

export interface PkgDataInterface {
    version: string;
    [index: string]: unknown;
}

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function relativePath(pathStr: string): string {
    const relativePathStr = path.relative(process.cwd(), pathStr);
    return path.isAbsolute(relativePathStr) || relativePathStr.startsWith('.')
        ? relativePathStr
        : `.${path.sep}${relativePathStr}`;
}

export function isPkgData(value: unknown): value is PkgDataInterface {
    if (isObject(value)) {
        return typeof value.version === 'string';
    }
    return false;
}

export async function readJSONFile(filepath: string): Promise<unknown> {
    try {
        const dataText = await readFileAsync(filepath, 'utf8');
        try {
            return JSON.parse(dataText);
        } catch (error) {
            throw new Error(`Invalid JSON: ${relativePath(filepath)}`);
        }
    } catch (error) {
        throw new Error(`Could not read file: ${relativePath(filepath)}`);
    }
}
