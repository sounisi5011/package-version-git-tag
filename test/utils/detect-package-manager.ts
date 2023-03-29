import mockFs from 'mock-fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
    getPackageManagerData,
    PackageManagerData,
} from '../../src/utils/detect-package-manager';
import { valueFinally } from '../helpers';

process.env = {};

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
