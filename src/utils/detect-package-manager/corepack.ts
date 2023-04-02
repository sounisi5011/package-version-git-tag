import path from 'path';

import {
    isObject,
    readJSONFile,
    relativePath,
    walkParentDir,
} from '../../utils.js';
import type { PackageManagerInfo } from './types.js';
import { isPackageManagerType } from './types.js';

const nodeModulesRegExp =
    /[\\/]node_modules[\\/](?:@[^\\/]*[\\/])?(?:[^@\\/][^\\/]*)$/;

/**
 * @see https://github.com/nodejs/corepack/blob/v0.17.1/sources/specUtils.ts#L95-L110
 */
async function tryReadPackageManagerField(
    cwd: string,
): Promise<{ packageManager: unknown } | undefined> {
    if (nodeModulesRegExp.test(cwd)) return undefined;

    const pkgJsonPath = path.join(cwd, 'package.json');
    const pkgJson = await readJSONFile(pkgJsonPath, {
        allowNotExist: true,
    });
    if (pkgJson === undefined) return undefined;
    if (!isObject(pkgJson)) {
        throw new Error(`Invalid package.json: ${relativePath(pkgJsonPath)}`);
    }
    return { packageManager: pkgJson['packageManager'] };
}

/**
 * @see https://github.com/nodejs/corepack/blob/v0.17.1/sources/specUtils.ts
 */
export async function detectPackageManagerUsingCorepackConfig({
    cwd,
}: {
    readonly cwd: string;
}): Promise<PackageManagerInfo | undefined> {
    let packageManager: unknown;

    for (const dirpath of walkParentDir(cwd)) {
        const result = await tryReadPackageManagerField(dirpath);
        if (!result) continue;
        packageManager = result.packageManager;

        // Corepack's algorithm seems to finish reading "package.json" if the value of the "packageManager" field is truthy.
        // see https://github.com/nodejs/corepack/blob/v0.17.1/sources/specUtils.ts#L91
        if (packageManager) break;
    }

    const match =
        typeof packageManager === 'string' &&
        /^(?!_)(.+)@./.exec(packageManager);
    // This CLI is not Corepack, so it will ignore the invalid "packageManager" field without throwing an error.
    if (!match || !isPackageManagerType(match[1])) return undefined;

    return { name: match[1] };
}
