import path from 'node:path';

import { detectPackageManagerUsingCorepackConfig } from './detect-package-manager/corepack.js';
import { detectPackageManagerUsingEnv } from './detect-package-manager/env.js';
import { detectPackageManagerUsingNodeModulesDirOrLockfile } from './detect-package-manager/node_modules-or-lockfiles.js';
import type { PackageManagerData } from './detect-package-manager/types.js';

const jsFileExtentions = ['.cjs', '.mjs', '.js'] as const;
function isJsPath(
    filepath: string,
): filepath is `${string}${(typeof jsFileExtentions)[number]}` {
    return (jsFileExtentions as readonly string[]).includes(
        // We use the result of the "path.extname()" function instead of the filepath suffix.
        // This is because a "suffix starting with a dot" is not always a file extension.
        // For example: path.extname('.js') === ''
        path.extname(filepath),
    );
}

/**
 * Detects what package manager was used to run this script.
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 * @see https://github.com/BendingBender/yarpm/blob/v1.2.0/lib/index.js#L55-L67
 */
export async function getPackageManagerData(options: {
    readonly cwd: string;
}): Promise<PackageManagerData> {
    const pmEnv = detectPackageManagerUsingEnv();
    if (pmEnv.npmPath) {
        return {
            name: pmEnv.type,
            spawnArgs: isJsPath(pmEnv.npmPath)
                ? [process.execPath, [pmEnv.npmPath]]
                : [pmEnv.npmPath, []],
        };
    }
    if (pmEnv.type) {
        return {
            name: pmEnv.type,
            spawnArgs: [pmEnv.type, []],
        };
    }

    for (const detector of [
        detectPackageManagerUsingCorepackConfig,
        detectPackageManagerUsingNodeModulesDirOrLockfile,
    ]) {
        const packageManager = await detector(options);
        if (packageManager) {
            return {
                name: packageManager.name,
                spawnArgs: [packageManager.name, []],
            };
        }
    }

    return {
        name: undefined,
        spawnArgs: ['npm', []],
    };
}
