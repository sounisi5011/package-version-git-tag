import path from 'path';
import whichPMRuns from 'which-pm-runs';

import type { PackageManagerType } from './types';
import { isPackageManagerType, packageManagerTypeList } from './types';

/**
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L160
 * @see https://github.com/BendingBender/yarpm/blob/v1.2.0/lib/index.js#L55-L64
 */
export function detectPackageManagerUsingEnv(): {
    type: PackageManagerType | undefined;
    npmPath: string | undefined;
} {
    const npmPath = process.env['npm_execpath'];
    // Conditional expressions `npmPath !== undefined` and `typeof npmPath === 'string'` are not used.
    // Because empty strings are excluded here.
    if (npmPath) {
        const lowerCaseNpmPathBaseName = path.basename(npmPath).toLowerCase();
        return {
            type: packageManagerTypeList.find((type) =>
                lowerCaseNpmPathBaseName.startsWith(type),
            ),
            npmPath,
        };
    }

    const packageManager = whichPMRuns()?.name;
    return {
        type: isPackageManagerType(packageManager) ? packageManager : undefined,
        npmPath: undefined,
    };
}
