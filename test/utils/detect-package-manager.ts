import slugify from '@sindresorhus/slugify';
import execa from 'execa';
import fs from 'fs/promises';
import mockFs from 'mock-fs';
import os from 'os';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

import { name as packageName } from '../../package.json';
import { readParentIter } from '../../src/utils';
import {
    getPackageManagerData,
    PackageManagerData,
} from '../../src/utils/detect-package-manager';
import { getTestNameList, retryExec, valueFinally } from '../helpers';
import { COREPACK_HOME, TINY_NPM_PACKAGE } from '../helpers/const';
import * as corepackPackageManager from '../helpers/corepack-package-managers';
import { tmpDir } from '../helpers/tmp';

// Remove all environment variables set by npm
process.env = Object.fromEntries(
    Object.entries(process.env).flatMap<[string, (typeof process.env)[string]]>(
        (envEntry) => (!/^npm[_-]/i.test(envEntry[0]) ? [envEntry] : []),
    ),
);

function mockCwd<T>(
    newCwd: string | undefined,
    fn: () => T,
): T extends PromiseLike<unknown> ? Promise<Awaited<T>> : T {
    // We do not use the "process.chdir()" function for the following reasons:
    // 1. "process.chdir()" cannot specify a path that does not exist
    // 2. "process.chdir()" cannot be used in Vitest test code
    //    see https://github.com/vitest-dev/vitest/issues/1436

    let originalCwdDesc: PropertyDescriptor | undefined;
    if (newCwd !== undefined) {
        // We use the "path.join()" function instead of the "path.normalize()" function.
        // This is because the "path.normalize()" function on Windows does not convert the prefix "//" to "\".
        // For example:
        //     path.normalize('/' + 'path/to')  // => \foo\bar\baz  // Converted to absolute path as expected
        //     path.normalize('/' + '/path/to') // => \\foo\bar\baz // Oops!
        const normalizedNewCWD = path.join('/', newCwd);

        originalCwdDesc = Object.getOwnPropertyDescriptor(process, 'cwd')!;
        Object.defineProperty(process, 'cwd', {
            value: () => normalizedNewCWD,
        });
    }
    return valueFinally(fn(), () => {
        if (originalCwdDesc)
            Object.defineProperty(process, 'cwd', originalCwdDesc);
    });
}

const createInstalledDir = (() => {
    interface Options {
        readonly packageManager: string;
        readonly installCommand: (
            pkg: string[],
        ) => readonly [string, readonly string[]];
    }
    interface Result {
        readonly nodeModulesDirOnly: string;
        readonly lockfiles: string;
    }
    const cache = new Map<string, Promise<Result>>();

    return (...optionsList: [Options, ...Options[]]): Promise<Result> => {
        const packageManagerList = optionsList.map(
            ({ installCommand: createInstallCommand, ...options }) => {
                const installCommand = createInstallCommand([TINY_NPM_PACKAGE]);
                return {
                    ...options,
                    installCommand,
                    cacheKey: (
                        [
                            ...Object.values(options),
                            ...installCommand.flat(),
                        ] satisfies string[]
                    ).join('\0'),
                };
            },
        );
        const cacheKey = packageManagerList
            .map(({ cacheKey }) => cacheKey)
            .join('\n');
        const cacheHit = cache.get(cacheKey);
        if (cacheHit) return cacheHit;

        const result = (async (): Promise<Result> => {
            const installedDirpath = await fs.mkdtemp(
                path.join(
                    os.tmpdir(),
                    `${packageName}.test-fixtures.${slugify(
                        packageManagerList
                            .map(({ packageManager }) =>
                                corepackPackageManager.omitPmHash(
                                    packageManager,
                                ),
                            )
                            .join(' '),
                    )}.`,
                ),
            );
            const lockfilesDirpath = path.join(installedDirpath, 'lockfiles');
            const pkgJsonPath = path.join(lockfilesDirpath, 'package.json');

            await fs.mkdir(lockfilesDirpath, { recursive: true });
            for (const {
                packageManager,
                installCommand,
            } of packageManagerList) {
                const currentPkgJson = await fs
                    .readFile(pkgJsonPath, 'utf8')
                    .then((pkgJsonStr) => JSON.parse(pkgJsonStr) as object)
                    .catch(() => ({}));
                await fs.writeFile(
                    pkgJsonPath,
                    JSON.stringify({ ...currentPkgJson, packageManager }),
                );
                await execa(...installCommand, {
                    cwd: lockfilesDirpath,
                    env: { COREPACK_HOME },
                });
            }

            const nodeModulesDirOnlyDirpath = path.join(
                installedDirpath,
                'mod-only',
            );
            await Promise.all([
                (async () => {
                    await fs.mkdir(nodeModulesDirOnlyDirpath, {
                        recursive: true,
                    });
                    await fs.rename(
                        path.join(lockfilesDirpath, 'node_modules'),
                        path.join(nodeModulesDirOnlyDirpath, 'node_modules'),
                    );
                })(),
                fs.unlink(pkgJsonPath),
            ]);

            return {
                nodeModulesDirOnly: nodeModulesDirOnlyDirpath,
                lockfiles: lockfilesDirpath,
            };
        })();
        cache.set(cacheKey, result);
        return result;
    };
})();

beforeAll(async () => {
    // Corepack throws an error if it cannot fetch the package manager.
    // This error also occurs on GitHub Actions in rare cases.
    // To avoid this, pre-fetch all package managers used in the tests.
    await retryExec(
        () =>
            execa('corepack', ['prepare', ...corepackPackageManager.allList], {
                env: { COREPACK_HOME },
            }),
        ({ stdout, stderr }) =>
            [stdout, stderr].some((stdoutOrStderr) =>
                /\bError when performing the request\b/i.test(stdoutOrStderr),
            ),
    );
});

describe(`detect package manager using the "packageManager" field in "package.json"`, () => {
    it.each(
        Object.entries<{
            cwd?: string;
            fileSystem: NonNullable<Parameters<typeof mockFs>[0]>;
            expected: PackageManagerData;
        }>({
            'should read the "package.json" file in the current working directory':
                {
                    fileSystem: {
                        'package.json': JSON.stringify({
                            packageManager: 'npm@123.4.5',
                        }),
                    },
                    expected: {
                        name: 'npm',
                        spawnArgs: ['npm', []],
                    },
                },
            'should read the "package.json" file in the parent directory': {
                fileSystem: {
                    '../package.json': JSON.stringify({
                        packageManager: 'yarn@123.4.5',
                    }),
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should read the "package.json" file in the ancestor directory': {
                fileSystem: {
                    '/package.json': JSON.stringify({
                        packageManager: 'yarn@123.4.5',
                    }),
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should read the "package.json" file in the nearest directory': {
                fileSystem: {
                    'package.json': JSON.stringify({
                        packageManager: 'yarn@123.4.5',
                    }),
                    '../package.json': JSON.stringify({
                        packageManager: 'pnpm@123.4.5',
                    }),
                    '/package.json': JSON.stringify({
                        packageManager: 'npm@123.4.5',
                    }),
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should skip "package.json" files that do not contain the "packageManager" field':
                {
                    fileSystem: {
                        'package.json': JSON.stringify({
                            foo: 42,
                        }),
                        '../package.json': JSON.stringify({
                            packageManager: 'pnpm@123.4.5',
                        }),
                        '/package.json': JSON.stringify({
                            packageManager: 'npm@123.4.5',
                        }),
                    },
                    expected: {
                        name: 'pnpm',
                        spawnArgs: ['pnpm', []],
                    },
                },
            'should not skip "package.json" files that contain invalid "packageManager" fields':
                {
                    fileSystem: {
                        'package.json': JSON.stringify({
                            packageManager: 42,
                        }),
                        '../package.json': JSON.stringify({
                            packageManager: 'pnpm@123.4.5',
                        }),
                        '/package.json': JSON.stringify({
                            packageManager: 'npm@123.4.5',
                        }),
                    },
                    expected: {
                        name: undefined,
                        spawnArgs: ['npm', []],
                    },
                },
            'should not read the "package.json" file in the "node_modules/{somepackagename}" directory':
                {
                    cwd: '/path/to/node_modules/foo',
                    fileSystem: {
                        'package.json': JSON.stringify({
                            packageManager: 'yarn@123.4.5',
                        }),
                        '../package.json': JSON.stringify({
                            packageManager: 'pnpm@123.4.5',
                        }),
                    },
                    expected: {
                        name: 'pnpm',
                        spawnArgs: ['pnpm', []],
                    },
                },
            'should not read the "package.json" file in the "node_modules/@{somescope}/{somepackagename}" directory':
                {
                    cwd: '/path/to/node_modules/@foo/bar',
                    fileSystem: {
                        'package.json': JSON.stringify({
                            packageManager: 'yarn@123.4.5',
                        }),
                        '../package.json': JSON.stringify({
                            packageManager: 'npm@123.4.5',
                        }),
                        '../../package.json': JSON.stringify({
                            packageManager: 'pnpm@123.4.5',
                        }),
                    },
                    expected: {
                        name: 'npm',
                        spawnArgs: ['npm', []],
                    },
                },
            'should return undefined if the "package.json" file does not exist':
                {
                    fileSystem: {},
                    expected: {
                        name: undefined,
                        spawnArgs: ['npm', []],
                    },
                },
            'should return undefined if an unknown package manager is detected':
                {
                    fileSystem: {
                        'package.json': JSON.stringify({
                            packageManager: 'dragon@123.4.5',
                        }),
                    },
                    expected: {
                        name: undefined,
                        spawnArgs: ['npm', []],
                    },
                },
            'package manager names should be lowercase (Yarn)': {
                fileSystem: {
                    'package.json': JSON.stringify({
                        packageManager: 'Yarn@123.4.5',
                    }),
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
            'package manager names should be lowercase (NPM)': {
                fileSystem: {
                    'package.json': JSON.stringify({
                        packageManager: 'NPM@123.4.5',
                    }),
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
            'package manager names should be lowercase (pnPm)': {
                fileSystem: {
                    'package.json': JSON.stringify({
                        packageManager: 'pnPm@123.4.5',
                    }),
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
        }),
    )('%s', async (_, { cwd: customCwd, fileSystem, expected }) => {
        await mockCwd(customCwd, async () => {
            try {
                mockFs(fileSystem);

                await expect(
                    getPackageManagerData({ cwd: process.cwd() }),
                ).resolves.toStrictEqual(expected);
            } finally {
                mockFs.restore();
            }
        });
    });
});

{
    interface TestCase {
        readonly packageManager: (typeof corepackPackageManager.allList)[number];
        readonly installCommand: (
            pkg: string[],
        ) => readonly [string, readonly string[]];
        readonly expected: PackageManagerData;
    }

    const testCases: readonly TestCase[] = [
        ...corepackPackageManager.npmList.map<TestCase>((packageManager) => ({
            packageManager,
            installCommand: (pkg) => ['npm', ['install', ...pkg]],
            expected: {
                name: 'npm',
                spawnArgs: ['npm', []],
            },
        })),
        ...corepackPackageManager.yarnList.map<TestCase>((packageManager) => ({
            packageManager,
            installCommand: (pkg) => ['yarn', ['add', ...pkg]],
            expected: {
                name: 'yarn',
                spawnArgs: ['yarn', []],
            },
        })),
        ...corepackPackageManager.pnpmList.map<TestCase>((packageManager) => ({
            packageManager,
            installCommand: (pkg) => ['pnpm', ['add', ...pkg]],
            expected: {
                name: 'pnpm',
                spawnArgs: ['pnpm', []],
            },
        })),
    ];

    const ignoreError =
        (code: string) =>
        (error: unknown): null => {
            if ((error as Record<string, unknown> | null)?.['code'] === code)
                return null;
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw error;
        };

    const tryRm = async (filepath: string | null): Promise<void> => {
        if (filepath !== null) {
            await fs.rm(filepath, {
                recursive: true,
                force: true,
            });
        }
    };

    const updateSymlink = async (
        target: string,
        linkpath: string,
    ): Promise<void> => {
        let tmpLinkpath = linkpath;
        while (
            !(await fs
                .symlink(target, tmpLinkpath)
                .then(() => true, ignoreError('EEXIST')))
        ) {
            const randStr = Math.random().toString(36).substring(2);
            tmpLinkpath = `${linkpath}~${randStr}`;
        }
        if (tmpLinkpath !== linkpath) await fs.rename(tmpLinkpath, linkpath);
    };

    const getFilenameDirectlyUnderTmpdir = async (
        filename: string,
    ): Promise<string> => {
        const tryRealpath = async (path: string): Promise<string> =>
            await fs.realpath(path).catch(() => path);
        const tmpDir = await tryRealpath(os.tmpdir());

        for (const dirname of readParentIter(await tryRealpath(filename))) {
            if (path.dirname(dirname) === tmpDir) {
                return dirname;
            }
        }

        return filename;
    };

    describe(`detect package manager by reading the "node_modules" directory`, () => {
        for (const { packageManager, installCommand, expected } of testCases) {
            it.concurrent(
                corepackPackageManager.omitPmHash(packageManager),
                // eslint-disable-next-line vitest/no-done-callback
                async (ctx) => {
                    const virtualTestDirpath = tmpDir(
                        ...getTestNameList(ctx.meta),
                    );
                    const [
                        { nodeModulesDirOnly: actualTestDirpath },
                        oldInstalledDir,
                    ] = await Promise.all([
                        createInstalledDir({
                            packageManager,
                            installCommand,
                        }),
                        fs
                            .realpath(virtualTestDirpath)
                            .then(getFilenameDirectlyUnderTmpdir)
                            .catch(ignoreError('ENOENT')),
                    ]);
                    await Promise.all([
                        tryRm(oldInstalledDir),
                        updateSymlink(actualTestDirpath, virtualTestDirpath),
                    ]);

                    for (const [message, cwd] of Object.entries({
                        'should read the "node_modules" directory in the current working directory':
                            actualTestDirpath,
                        'should read the "node_modules" directory in the parent directory':
                            path.join(actualTestDirpath, 'child'),
                        'should read the "node_modules" directory in the ancestor directory':
                            path.join(actualTestDirpath, 'path/to/foo/bar'),
                    })) {
                        await expect(
                            getPackageManagerData({ cwd }),
                            message,
                        ).resolves.toStrictEqual(expected);
                    }
                },
            );
        }
    });

    describe(`detect package manager using lockfiles`, () => {
        for (const { packageManager, installCommand, expected } of testCases) {
            it.concurrent(
                corepackPackageManager.omitPmHash(packageManager),
                // eslint-disable-next-line vitest/no-done-callback
                async (ctx) => {
                    const virtualTestDirpath = tmpDir(
                        ...getTestNameList(ctx.meta),
                    );
                    const [{ lockfiles: actualTestDirpath }, oldInstalledDir] =
                        await Promise.all([
                            createInstalledDir({
                                packageManager,
                                installCommand,
                            }),
                            fs
                                .realpath(virtualTestDirpath)
                                .then(getFilenameDirectlyUnderTmpdir)
                                .catch(ignoreError('ENOENT')),
                        ]);
                    await Promise.all([
                        tryRm(oldInstalledDir),
                        updateSymlink(actualTestDirpath, virtualTestDirpath),
                    ]);

                    for (const [message, cwd] of Object.entries({
                        'should use lockfiles in the current working directory':
                            actualTestDirpath,
                        'should use lockfiles in the parent directory':
                            path.join(actualTestDirpath, 'child'),
                        'should use lockfiles in the ancestor directory':
                            path.join(actualTestDirpath, 'path/to/foo/bar'),
                    })) {
                        await expect(
                            getPackageManagerData({ cwd }),
                            message,
                        ).resolves.toStrictEqual(expected);
                    }
                },
            );
        }
    });
}
