import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const execFileAsync = promisify(execFile);

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

let isPrintedVerbose = false;

export function printVerbose(message: string): void {
    if (!isPrintedVerbose) {
        console.error(`\n${message}`);
        isPrintedVerbose = true;
    } else {
        console.error(message);
    }
}

export function endPrintVerbose(): void {
    if (isPrintedVerbose) {
        console.error();
    }
}

/**
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 */
export function getNpmExecPath(): {
    execPath: string;
    spawnArgs: string[];
    isYarn: boolean;
} {
    const npmPath = process.env.npm_execpath;
    const npmPathIsJs =
        typeof npmPath === 'string' && /^\.m?js$/.test(path.extname(npmPath));
    const execPath = npmPathIsJs ? process.execPath : npmPath || 'npm';
    const isYarn = path.basename(npmPath || 'npm').startsWith('yarn');

    return {
        execPath,
        spawnArgs: typeof npmPath === 'string' && npmPathIsJs ? [npmPath] : [],
        isYarn,
    };
}

export async function getConfig(keyMap: {
    npm: string;
    yarn?: string;
}): Promise<string> {
    const { execPath, spawnArgs, isYarn } = getNpmExecPath();

    const { stdout } = await execFileAsync(execPath, [
        ...spawnArgs,
        'config',
        'get',
        (isYarn && keyMap.yarn) || keyMap.npm,
    ]);

    console.error([
        {
            // eslint-disable-next-line @typescript-eslint/camelcase
            npm_execpath: process.env.npm_execpath,
            execPath: process.execPath,
        },
        Object.entries(process.env)
            .filter(([, v]) => v && /yarn/.test(v))
            .reduce<typeof process.env>(
                (obj, [k, v]) => ({ ...obj, [k]: v }),
                {},
            ),
        [],
        execPath,
        [...spawnArgs, 'config', 'get', (isYarn && keyMap.yarn) || keyMap.npm],
        [],
        { stdout },
    ]);

    return stdout.replace(/\n$/, '');
}
