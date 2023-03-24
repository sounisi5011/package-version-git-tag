import type childProcess from 'child_process';
import { commandJoin } from 'command-join';
import crossSpawn from 'cross-spawn';
import fs from 'fs/promises';
import path from 'path';
import v8 from 'v8';
import whichPMRuns from 'which-pm-runs';

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
        return typeof value['version'] === 'string';
    }
    return false;
}

export async function readJSONFile(filepath: string): Promise<unknown> {
    try {
        const dataText = await fs.readFile(filepath, 'utf8');
        try {
            return JSON.parse(dataText) as unknown;
        } catch (error) {
            throw new Error(`Invalid JSON: ${relativePath(filepath)}`);
        }
    } catch (error) {
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
    reject: (reason: Error) => void;
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
        reject(error);
    };
}

/**
 * @see https://github.com/nodejs/node/blob/v12.13.0/lib/child_process.js#L305-L315
 */
function execErrorhandler({
    process,
    reject,
}: {
    process: childProcess.ChildProcess;
    reject: (reason: Error) => void;
}): (error: Error) => void {
    return (error) => {
        if (process.stdout) {
            process.stdout.destroy();
        }
        if (process.stderr) {
            process.stderr.destroy();
        }
        reject(error);
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

        if (process.stdout) {
            process.stdout.on('data', (data) => stdoutList.push(data));
        }
        if (process.stderr) {
            process.stderr.on('data', (data) => stderrList.push(data));
        }

        process.on(
            'close',
            execExithandler({
                command: args[0],
                args: args[1] ?? [],
                stdoutList,
                stderrList,
                resolve,
                reject,
            }),
        );
        process.on('error', execErrorhandler({ process, reject }));
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

/**
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 */
export function getNpmExecPath(): {
    execPath: string;
    spawnArgs: string[];
    isYarn: boolean;
} {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const npmPath = process.env['npm_execpath'] || whichPMRuns()?.name || 'npm';
    const npmPathIsJs = /^\.m?js$/.test(path.extname(npmPath));
    const execPath = npmPathIsJs ? process.execPath : npmPath;
    const isYarn = path.basename(npmPath).startsWith('yarn');

    return {
        execPath,
        spawnArgs: typeof npmPath === 'string' && npmPathIsJs ? [npmPath] : [],
        isYarn,
    };
}

export async function getConfig(keyMap: {
    npm: string;
    yarn?: string | undefined;
}): Promise<string> {
    const { execPath, spawnArgs, isYarn } = getNpmExecPath();

    const { stdout } = await execFileAsync(execPath, [
        ...spawnArgs,
        'config',
        'get',
        (isYarn && keyMap.yarn) || keyMap.npm,
    ]);
    return stdout.replace(/\n$/, '');
}
