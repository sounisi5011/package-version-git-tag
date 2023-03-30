import path from 'path';
import whichPm from 'which-pm';
import whichPMRuns from 'which-pm-runs';

import { isObject, readJSONFile, readParentIter, relativePath } from '../utils';

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

// The "Array.prototype.includes()" method is slow, so we create a Set object to use the "Set.prototype.has()" method instead.
const packageManagerTypeSet = new Set(packageManagerTypeList);
function isPackageManagerType(value: unknown): value is PackageManagerType {
    return (packageManagerTypeSet as Set<unknown>).has(value);
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
        type: isPackageManagerType(packageManager) ? packageManager : undefined,
        npmPath: undefined,
    };
}

interface PackageManagerInfo {
    name: PackageManagerType;
}

const nodeModulesRegExp =
    /[\\/]node_modules[\\/](?:@[^\\/]*[\\/])?(?:[^@\\/][^\\/]*)$/;

/**
 * @see https://github.com/nodejs/corepack/blob/v0.17.1/sources/specUtils.ts
 */
async function detectPackageManagerUsingCorepackConfig({
    cwd,
}: {
    readonly cwd: string;
}): Promise<PackageManagerInfo | undefined> {
    let packageManager: unknown;

    for (const dirpath of readParentIter(cwd)) {
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

async function detectPackageManagerUsingNodeModulesDir({
    cwd,
}: {
    readonly cwd: string;
}): Promise<PackageManagerInfo | undefined> {
    for (const dirpath of readParentIter(cwd)) {
        const pm = await (whichPm(dirpath) as Promise<Awaited<
            ReturnType<typeof whichPm>
        > | null>);
        if (pm && isPackageManagerType(pm.name)) {
            return { name: pm.name };
        }
    }
    return undefined;
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
        detectPackageManagerUsingNodeModulesDir,
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
