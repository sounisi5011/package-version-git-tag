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

/**
 * Detects what package manager was used to run this script.
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 */
export function getPackageManagerData(): {
    name: 'npm' | 'yarn' | 'pnpm' | undefined;
    spawnArgs: [commandName: string, prefixArgs: string[]];
} {
    const npmPath = process.env['npm_execpath'];
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const commandName = npmPath || whichPMRuns()?.name || 'npm';
    const lowerCaseNpmPathBaseName = path.basename(commandName).toLowerCase();

    return {
        name: (['npm', 'yarn', 'pnpm'] as const).find((type) =>
            lowerCaseNpmPathBaseName.startsWith(type),
        ),
        spawnArgs:
            typeof npmPath === 'string' && /\.[cm]?js$/.test(npmPath)
                ? [process.execPath, [npmPath]]
                : [commandName, []],
    };
}

const corepackErrorRegExp = /\bThis project is configured to use \w+\b/i;
const isDifferentPackageManagerError = (error: unknown): boolean =>
    isObject(error) &&
    typeof error['stdout'] === 'string' &&
    typeof error['stderr'] === 'string' &&
    (corepackErrorRegExp.test(error['stdout']) ||
        corepackErrorRegExp.test(error['stderr']));

/**
 * Run the "pnpm config get ..." command to try to get the config.
 * @returns Return `null` if npm execution is refused by Corepack. Otherwise, return the value of the config.
 * @throws If the "pnpm config get ..." command fails, an error is thrown.
 */
async function tryNpmConfigGet(key: string): Promise<string | null> {
    return await execFileAsync('npm', ['config', 'get', key], {
        env: {
            ...process.env,
            // In Corepack v0.14 and later, the environment variable "COREPACK_ENABLE_STRICT" can be used.
            // This allows npm commands to be used even in projects with non-npm package managers defined.
            // see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
            COREPACK_ENABLE_STRICT: '0',
        },
    })
        .then(({ stdout }) => stdout.replace(/\n$/, ''))
        .catch((error: unknown) => {
            // If an error occurs that is caused by Corepack, ignore the error.
            // Note: This conditional expression is required to support older Corepacks where the environment variable "COREPACK_ENABLE_STRICT" is not available.
            if (isDifferentPackageManagerError(error)) {
                return null;
            }
            throw error;
        });
}

const configListCache = new Map<string, string>();
/**
 * Verify if the specified configurations are defined.
 * @returns Return `true` if the specified config is defined. Otherwise, return `false`.
 */
async function isConfigDefined(
    spawnArgs: readonly [commandName: string, prefixArgs: readonly string[]],
    key: string,
): Promise<boolean> {
    const cacheKey = JSON.stringify(spawnArgs);

    let configListStr = configListCache.get(cacheKey);
    if (configListStr === undefined) {
        // The "npm config list" and "pnpm config list" commands return only the configurations defined in the ".npmrc" file.
        // It will not include any undefined configurations.
        // Note: It does not use JSON output. Because:
        //       + The result of the "npm config list --json" command will contain npm's builtin config.
        //       + JSON parsing may fail or return JSON with unexpected structure.
        ({ stdout: configListStr } = await execFileAsync(
            spawnArgs[0],
            spawnArgs[1].concat('config', 'list'),
        ));
        configListCache.set(cacheKey, configListStr);
    }

    const iniMatchRegExp = new RegExp(
        String.raw`(?<=^|[\r\n])(?:(?![\r\n])\s)*(?:(['"]?)${key}\1)(?:(?![\r\n])\s)*(?=[=\r\n]|$)`,
    );
    return iniMatchRegExp.test(configListStr);
}

const npmBuiltinConfig: Record<string, string> = {
    // see https://github.com/npm/cli/blob/v2.15.12/lib/config/defaults.js#L200
    // see https://github.com/npm/cli/blob/v3.10.10/lib/config/defaults.js#L204
    // see https://github.com/npm/cli/blob/v4.6.1/lib/config/defaults.js#L213
    // see https://github.com/npm/cli/blob/v5.10.0/lib/config/defaults.js#L228
    // see https://github.com/npm/cli/blob/v6.14.18/lib/config/defaults.js#L236
    // see https://github.com/npm/cli/blob/v7.24.2/lib/utils/config/definitions.js#L1922
    // see https://github.com/npm/cli/blob/v8.19.4/lib/utils/config/definitions.js#L2088
    // see https://github.com/npm/cli/blob/v9.6.2/lib/utils/config/definitions.js#L2080
    'tag-version-prefix': 'v',
    // see https://github.com/npm/npmconf/blob/v2.1.2/config-defs.js#L183
    // see https://github.com/npm/cli/blob/v2.15.12/lib/config/defaults.js#L166
    // see https://github.com/npm/cli/blob/v3.10.10/lib/config/defaults.js#L169
    // see https://github.com/npm/cli/blob/v4.6.1/lib/config/defaults.js#L173
    // see https://github.com/npm/cli/blob/v5.10.0/lib/config/defaults.js#L178
    // see https://github.com/npm/cli/blob/v6.14.18/lib/config/defaults.js#L183
    // see https://github.com/npm/cli/blob/v7.24.2/lib/utils/config/definitions.js#L1199
    // see https://github.com/npm/cli/blob/v8.19.4/lib/utils/config/definitions.js#L1314
    // see https://github.com/npm/cli/blob/v9.6.2/lib/utils/config/definitions.js#L1338
    message: '%s',
};

export async function getConfig(keyMap: {
    npm: string;
    yarn?: string | undefined;
}): Promise<string> {
    const packageManager = getPackageManagerData();

    // The "pnpm version" command executes the "npm version" command internally.
    // see https://github.com/pnpm/pnpm/blob/v7.30.0/pnpm/src/pnpm.ts#L27-L61
    // If possible, the "npm config get ..." command should be executed instead.
    if (packageManager.name === 'pnpm') {
        const result = await tryNpmConfigGet(keyMap.npm);
        if (result !== null) return result;
    }

    const key =
        packageManager.name === 'yarn' ? keyMap.yarn ?? keyMap.npm : keyMap.npm;
    const result = await execFileAsync(
        packageManager.spawnArgs[0],
        packageManager.spawnArgs[1].concat('config', 'get', key),
    ).then(({ stdout }) => stdout.replace(/\n$/, ''));

    // The "pnpm config get ..." command does not detect npm builtin config.
    // And if the config is not defined, the "pnpm config get ..." command returns an empty string.
    // So, if the "pnpm config get ..." command returns an empty string, it checks to see if the config is defined.
    // If the config is undefined, the npm builtin config is returned.
    if (
        packageManager.name === 'pnpm' &&
        result === '' &&
        !(await isConfigDefined(packageManager.spawnArgs, key))
    ) {
        return npmBuiltinConfig[key] ?? result;
    }

    return result;
}
