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

/**
 * Detects what package manager was used to run this script.
 * @see https://github.com/mysticatea/npm-run-all/blob/v4.1.5/lib/run-task.js#L157-L174
 */
export function getPackageManagerData(): PackageManagerData {
    const npmPath = process.env['npm_execpath'];
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const commandName = npmPath || whichPMRuns()?.name || 'npm';
    const lowerCaseNpmPathBaseName = path.basename(commandName).toLowerCase();

    return {
        name: packageManagerTypeList.find((type) =>
            lowerCaseNpmPathBaseName.startsWith(type),
        ),
        spawnArgs:
            typeof npmPath === 'string' && /\.[cm]?js$/.test(npmPath)
                ? [process.execPath, [npmPath]]
                : [commandName, []],
    };
}
