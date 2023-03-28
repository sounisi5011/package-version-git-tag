import path from 'path';
import whichPMRuns from 'which-pm-runs';

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
