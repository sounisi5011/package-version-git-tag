import type childProcess from 'child_process';
import { commandJoin } from 'command-join';
import crossSpawn from 'cross-spawn';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import v8 from 'v8';

export interface PkgDataInterface {
    version: string;
    [index: string]: unknown;
}

/**
 * Same as "any" or "unknown" type, but property access is available
 */
type AllowPropAny = null | undefined | Partial<Record<string, unknown>>;

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function relativePath(filepath: string | URL): string {
    const relativePathStr = path.relative(
        process.cwd(),
        filepath instanceof URL ? url.fileURLToPath(filepath) : filepath,
    );
    return path.isAbsolute(relativePathStr) || relativePathStr.startsWith('.')
        ? relativePathStr
        : `.${path.sep}${relativePathStr}`;
}

/**
 * Walk up parent directories
 */
export function* walkParentDir(filepath: string): IterableIterator<string> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        yield filepath;

        const parentDir = path.dirname(filepath);
        if (filepath === parentDir) break;
        filepath = parentDir;
    }
}

export async function isFile(
    filepath: string,
    options?: { allowNotExist?: boolean },
): Promise<boolean> {
    try {
        const stat = await fs.stat(filepath);
        return stat.isFile();
    } catch (error) {
        if (
            options?.allowNotExist &&
            (error as AllowPropAny)?.['code'] === 'ENOENT'
        ) {
            return false;
        }
        throw error;
    }
}

export function isPkgData(value: unknown): value is PkgDataInterface {
    if (isObject(value)) {
        return typeof value['version'] === 'string';
    }
    return false;
}

export async function readJSONFile(
    filepath: string | URL,
    options?: { allowNotExist?: boolean },
): Promise<unknown> {
    try {
        const dataText = await fs.readFile(filepath, 'utf8');
        try {
            return JSON.parse(dataText) as unknown;
        } catch (error) {
            throw new Error(`Invalid JSON: ${relativePath(filepath)}`);
        }
    } catch (error) {
        if (
            options?.allowNotExist &&
            (error as AllowPropAny)?.['code'] === 'ENOENT'
        ) {
            return undefined;
        }

        throw new Error(`Could not read file: ${relativePath(filepath)}`);
    }
}

declare const structuredClone: (<T>(value: T) => T) | undefined;
/**
 * @note This function copies values based on {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm The structured clone algorithm}.
 *       Some values, such as Function objects, cannot be copied.
 */
export const deepCopy: <T>(value: T) => T =
    typeof structuredClone === 'function'
        ? structuredClone
        : // structuredClone is available in Node.js 17 or later.
          // see https://nodejs.org/docs/latest-v18.x/api/globals.html#structuredclonevalue-options
          // For older Node.js, use the v8 module instead.
          (value) => v8.deserialize(v8.serialize(value)); // eslint-disable-line @typescript-eslint/no-unsafe-return

type ExecError = Error & {
    stdout: string;
    stderr: string;
};

/**
 * @see https://github.com/nodejs/node/blob/v12.13.0/lib/child_process.js#L250-L303
 */
function execExithandler({
    command,
    args = [],
    stdoutList,
    stderrList,
    resolve,
    reject,
}: {
    command: string;
    args: readonly string[];
    stdoutList: unknown[];
    stderrList: unknown[];
    resolve: (value: { stdout: string; stderr: string }) => void;
    reject: (reason: ExecError) => void;
}): (code: number, signal: string | null) => void {
    return (code, signal) => {
        const stdout = stdoutList.join('');
        const stderr = stderrList.join('');

        if (code === 0 && signal === null) {
            resolve({ stdout, stderr });
            return;
        }

        let cmd = command;
        if (args.length > 0) {
            cmd += ` ${commandJoin(args)}`;
        }

        const error = new Error(`Command failed: ${cmd}\n${stderr}`);
        reject(Object.assign(error, { code, stdout, stderr }));
    };
}

/**
 * @see https://github.com/nodejs/node/blob/v12.13.0/lib/child_process.js#L305-L315
 */
function execErrorhandler({
    process,
    stdoutList,
    stderrList,
    reject,
}: {
    process: childProcess.ChildProcess;
    stdoutList: unknown[];
    stderrList: unknown[];
    reject: (reason: ExecError) => void;
}): (error: Error) => void {
    return (error) => {
        const stdout = stdoutList.join('');
        const stderr = stderrList.join('');

        if (process.stdout) {
            process.stdout.destroy();
        }
        if (process.stderr) {
            process.stderr.destroy();
        }
        reject(Object.assign(error, { stdout, stderr }));
    };
}

/**
 * @see https://github.com/nodejs/node/blob/v12.13.0/lib/child_process.js#L178-L390
 */
export async function execFileAsync(
    ...args: [string, (readonly string[])?, childProcess.SpawnOptions?]
): Promise<{ readonly stdout: string; readonly stderr: string }> {
    return new Promise((resolve, reject) => {
        const process = crossSpawn(...args);
        const stdoutList: unknown[] = [];
        const stderrList: unknown[] = [];

        process.stdout?.on('data', (data) => stdoutList.push(data));
        process.stderr?.on('data', (data) => stderrList.push(data));

        const exitHandler = execExithandler({
            command: args[0],
            args: args[1] ?? [],
            stdoutList,
            stderrList,
            resolve,
            reject,
        });
        process.on('close', exitHandler);
        process.on(
            'error',
            execErrorhandler({ process, stdoutList, stderrList, reject }),
        );
    });
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
