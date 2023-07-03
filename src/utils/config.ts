// ///// ↓DEBUG↓ /////
import url from 'node:url';

// ///// ↑DEBUG↑ /////
import { execFileAsync, isObject } from '../utils.js';
import { getPackageManagerData } from './detect-package-manager.js';

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
            // ///// ↓DEBUG↓ /////
            NODE_OPTIONS:
                `${process.env['NODE_OPTIONS'] ?? ''} ` +
                `--require "${url
                    .fileURLToPath(
                        new URL('./segfault-handler.cjs', import.meta.url),
                    )
                    .replace(/[\\"]/g, '\\$&')}"`,
            // ///// ↑DEBUG↑ /////
        },
    })
        .then(({ stdout }) => stdout.replace(/\n$/, ''))
        .catch((error: unknown) => {
            // If an error occurs that is caused by Corepack, ignore the error.
            // Note: This conditional expression is required to support older Corepacks where the environment variable "COREPACK_ENABLE_STRICT" is not available.
            if (isDifferentPackageManagerError(error)) {
                return null;
            }
            // ///// ↓DEBUG↓ /////
            if (error !== null && error !== undefined)
                Object.assign(error, { __at: 'tryNpmConfigGet()' });
            // ///// ↑DEBUG↑ /////
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

export async function getConfig(
    cwd: string,
    keyMap: {
        npm: string;
        yarn?: string;
    },
): Promise<string> {
    const packageManager = await getPackageManagerData({ cwd });
    const key = { yarn: keyMap.npm, pnpm: keyMap.npm, ...keyMap }[
        packageManager.name ?? 'npm'
    ];

    // The "pnpm version" command executes the "npm version" command internally.
    // see https://github.com/pnpm/pnpm/blob/v7.30.0/pnpm/src/pnpm.ts#L27-L61
    // If possible, the "npm config get ..." command should be executed instead.
    if (packageManager.name === 'pnpm') {
        const result = await tryNpmConfigGet(keyMap.npm);
        if (result !== null) return result;
    }

    const result = await execFileAsync(
        packageManager.spawnArgs[0],
        packageManager.spawnArgs[1].concat('config', 'get', key),
    )
        .then(({ stdout }) => stdout.replace(/\n$/, ''))
        // ///// ↓DEBUG↓ /////
        .catch((error) => {
            if (error !== null && error !== undefined)
                Object.assign(error, { __at: 'getConfig()' });
            throw error;
        });
    // ///// ↑DEBUG↑ /////

    // The "pnpm config get ..." command does not detect npm builtin config.
    // And if the config is not defined, the "pnpm config get ..." command returns an empty string.
    // So, if the "pnpm config get ..." command returns an empty string, it checks to see if the config is defined.
    // If the config is undefined, the npm builtin config is returned.
    const defaultValue = npmBuiltinConfig[key];
    if (
        packageManager.name === 'pnpm' &&
        result === '' &&
        defaultValue !== undefined &&
        !(await isConfigDefined(packageManager.spawnArgs, key))
    )
        return defaultValue;

    return result;
}
