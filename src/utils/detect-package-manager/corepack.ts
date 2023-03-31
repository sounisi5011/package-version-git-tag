import path from 'path';

import {
    isObject,
    readJSONFile,
    relativePath,
    walkParentDir,
} from '../../utils';
import type { PackageManagerInfo } from './types';
import { isPackageManagerType } from './types';

const nodeModulesRegExp =
    /[\\/]node_modules[\\/](?:@[^\\/]*[\\/])?(?:[^@\\/][^\\/]*)$/;

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
        if (nodeModulesRegExp.test(dirpath)) continue;

        const pkgJsonPath = path.join(dirpath, 'package.json');
        const pkgJson = await readJSONFile(pkgJsonPath, {
            allowNotExist: true,
        });
        if (pkgJson === undefined) continue;
        if (!isObject(pkgJson)) {
            throw new Error(
                `Invalid package.json: ${relativePath(pkgJsonPath)}`,
            );
        }
        packageManager = pkgJson['packageManager'];

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
