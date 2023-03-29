import execa from 'execa';
import fs from 'fs/promises';
import mockFs from 'mock-fs';
import os from 'os';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

import { name as packageName } from '../../package.json';
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

describe(`detect package manager by reading the "node_modules" directory`, () => {
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

    function ignoreError(code: string): (error: unknown) => null {
        return (error) => {
            if ((error as Record<string, unknown> | null)?.['code'] === code)
                return null;
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw error;
        };
    }

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

    for (const { packageManager, installCommand, expected } of testCases) {
        it.concurrent(
            corepackPackageManager.omitPmHash(packageManager),
            // eslint-disable-next-line vitest/no-done-callback
            async (ctx) => {
                const virtualTestDirpath = tmpDir(...getTestNameList(ctx.meta));
                const actualTestDirpath = await fs.mkdtemp(
                    path.join(
                        os.tmpdir(),
                        `${packageName}.test-fixtures.${path.basename(
                            virtualTestDirpath,
                        )}.`,
                    ),
                );
                await Promise.all([
                    (async () => {
                        const intsallDirpath = path.join(
                            actualTestDirpath,
                            '.installed',
                        );
                        await fs.mkdir(intsallDirpath, { recursive: true });
                        await fs.writeFile(
                            path.join(intsallDirpath, 'package.json'),
                            JSON.stringify({ packageManager }),
                        );
                        await execa(...installCommand([TINY_NPM_PACKAGE]), {
                            cwd: intsallDirpath,
                            env: { COREPACK_HOME },
                        });
                        await fs.rename(
                            path.join(intsallDirpath, 'node_modules'),
                            path.join(actualTestDirpath, 'node_modules'),
                        );
                    })(),
                    fs
                        .realpath(virtualTestDirpath)
                        .then(async (oldTestDirpath) => {
                            await Promise.all([
                                fs.rm(oldTestDirpath, {
                                    recursive: true,
                                    force: true,
                                }),
                                updateSymlink(
                                    actualTestDirpath,
                                    virtualTestDirpath,
                                ),
                            ]);
                        })
                        .catch(async (error) => {
                            await updateSymlink(
                                actualTestDirpath,
                                virtualTestDirpath,
                            );
                            ignoreError('ENOENT')(error);
                        }),
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
