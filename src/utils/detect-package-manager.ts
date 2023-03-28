import path from 'path';
import whichPMRuns from 'which-pm-runs';

const packageManagerTypeList = [
    'npm',
    'yarn',
    'pnpm',
] as const satisfies readonly Lowercase<string>[];
export type PackageManagerType = (typeof packageManagerTypeList)[number];

export interface PackageManagerData {
    name: PackageManagerType | undefined;
    spawnArgs: [commandName: string, prefixArgs: string[]];
}

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
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L160
 * @see https://github.com/BendingBender/yarpm/blob/v1.2.0/lib/index.js#L55-L64
 */
function detectPackageManagerUsingEnv(): {
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
        type: packageManagerTypeList.find((type) => packageManager === type),
        npmPath: undefined,
    };
}

/**
 * Detects what package manager was used to run this script.
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 * @see https://github.com/BendingBender/yarpm/blob/v1.2.0/lib/index.js#L55-L67
 */
export function getPackageManagerData(): PackageManagerData {
    const pmEnv = detectPackageManagerUsingEnv();

    return {
        name: pmEnv.type,
        spawnArgs:
            pmEnv.npmPath && isJsPath(pmEnv.npmPath)
                ? [process.execPath, [pmEnv.npmPath]]
                : [pmEnv.npmPath ?? pmEnv.type ?? 'npm', []],
    };
}
