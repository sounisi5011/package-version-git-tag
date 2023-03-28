import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';

import {
    getPackageManagerData,
    PackageManagerData,
} from '../../src/utils/detect-package-manager';

const virtualFileSystem = new Map<string, string | object>();
vi.mock('fs/promises', () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    const readFile = async (path: string): Promise<string> => {
        const rawData = virtualFileSystem.get(path);
        if (rawData === undefined) {
            const message = `ENOENT: no such file or directory, open '${path}'`;
            throw Object.assign(new Error(message), {
                stack: message,
                errno: -2,
                code: 'ENOENT',
                syscall: 'open',
                path,
            });
        }
        return typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
    };
    return {
        readFile,
        default: {
            readFile,
        },
    };
});

process.env = {};

describe(`detect package manager using the "packageManager" field in "package.json"`, () => {
    const cwd = '/foo/bar/baz';

    it.each(
        Object.entries<{
            cwd?: string;
            fileSystem: Record<string, string | object>;
            expected: PackageManagerData;
        }>({
            'should read the "package.json" file in the current working directory':
                {
                    fileSystem: {
                        '{cwd}/package.json': {
                            packageManager: 'npm@123.4.5',
                        },
                    },
                    expected: {
                        name: 'npm',
                        spawnArgs: ['npm', []],
                    },
                },
            'should read the "package.json" file in the parent directory': {
                fileSystem: {
                    '{cwd}/../package.json': {
                        packageManager: 'yarn@123.4.5',
                    },
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should read the "package.json" file in the ancestor directory': {
                fileSystem: {
                    '/package.json': {
                        packageManager: 'yarn@123.4.5',
                    },
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should read the "package.json" file in the nearest directory': {
                fileSystem: {
                    '{cwd}/package.json': {
                        packageManager: 'yarn@123.4.5',
                    },
                    '{cwd}/../package.json': {
                        packageManager: 'pnpm@123.4.5',
                    },
                    '/package.json': {
                        packageManager: 'npm@123.4.5',
                    },
                },
                expected: {
                    name: 'yarn',
                    spawnArgs: ['yarn', []],
                },
            },
            'should skip "package.json" files that do not contain the "packageManager" field':
                {
                    fileSystem: {
                        '{cwd}/package.json': {
                            foo: 42,
                        },
                        '{cwd}/../package.json': {
                            packageManager: 'pnpm@123.4.5',
                        },
                        '/package.json': {
                            packageManager: 'npm@123.4.5',
                        },
                    },
                    expected: {
                        name: 'pnpm',
                        spawnArgs: ['pnpm', []],
                    },
                },
            'should not skip "package.json" files that contain invalid "packageManager" fields':
                {
                    fileSystem: {
                        '{cwd}/package.json': {
                            packageManager: 42,
                        },
                        '{cwd}/../package.json': {
                            packageManager: 'pnpm@123.4.5',
                        },
                        '/package.json': {
                            packageManager: 'npm@123.4.5',
                        },
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
                        '{cwd}/package.json': {
                            packageManager: 'yarn@123.4.5',
                        },
                        '{cwd}/../package.json': {
                            packageManager: 'pnpm@123.4.5',
                        },
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
                        '{cwd}/package.json': {
                            packageManager: 'yarn@123.4.5',
                        },
                        '{cwd}/../package.json': {
                            packageManager: 'npm@123.4.5',
                        },
                        '{cwd}/../../package.json': {
                            packageManager: 'pnpm@123.4.5',
                        },
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
                        '{cwd}/package.json': {
                            packageManager: 'dragon@123.4.5',
                        },
                    },
                    expected: {
                        name: undefined,
                        spawnArgs: ['npm', []],
                    },
                },
            'package manager names should be lowercase (Yarn)': {
                fileSystem: {
                    '{cwd}/../package.json': {
                        packageManager: 'Yarn@123.4.5',
                    },
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
            'package manager names should be lowercase (NPM)': {
                fileSystem: {
                    '{cwd}/../package.json': {
                        packageManager: 'NPM@123.4.5',
                    },
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
            'package manager names should be lowercase (pnPm)': {
                fileSystem: {
                    '{cwd}/../package.json': {
                        packageManager: 'pnPm@123.4.5',
                    },
                },
                expected: {
                    name: undefined,
                    spawnArgs: ['npm', []],
                },
            },
        }),
    )('%s', async (_, { cwd: customCwd, fileSystem, expected }) => {
        // eslint-disable-next-line vitest/no-conditional-in-test
        const cwd_ = path.normalize('/' + (customCwd ?? cwd));
        virtualFileSystem.clear();

        for (const [filepath, filedata] of Object.entries(fileSystem)) {
            virtualFileSystem.set(
                path.normalize(filepath.replace(/\{cwd\}/gi, cwd_)),
                filedata,
            );
        }

        await expect(
            getPackageManagerData({ cwd: cwd_ }),
        ).resolves.toStrictEqual(expected);

        virtualFileSystem.clear();
    });
});
