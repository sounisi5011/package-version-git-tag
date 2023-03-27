/* eslint vitest/max-expects: [warn, { max: 10 }] */

import slugify from '@sindresorhus/slugify';
import { commandJoin } from 'command-join';
import execa from 'execa';
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';
import { beforeAll, describe, expect, test } from 'vitest';

import PKG_DATA from '../package.json';
import * as corepackPackageManager from './helpers/corepack-package-managers';
import { initGit } from './helpers/git';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEST_TMP_DIR = path.resolve(__dirname, '.temp');
const CLI_DIR = path.resolve(TEST_TMP_DIR, '.cli');
const CLI_PATH = path.resolve(CLI_DIR, 'node_modules', '.bin', PKG_DATA.name);
/**
 * @see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
 */
const COREPACK_HOME = path.resolve(TEST_TMP_DIR, '.corepack');

const createdTmpDirSet = new Set<string>();
function tmpDir(...uniqueNameList: (string | undefined)[]): string {
    const uniqueName = slugify(
        uniqueNameList.map((name) => name ?? '').join(' ') || 'test',
    );
    let dirname: string = uniqueName;
    for (let i = 2; createdTmpDirSet.has(dirname); i++) {
        dirname = `${uniqueName}_${i}`;
    }
    createdTmpDirSet.add(dirname);
    return path.resolve(TEST_TMP_DIR, dirname);
}

async function retryExec(
    fn: () => execa.ExecaChildProcess,
    isSkip: (error: execa.ExecaError) => boolean,
): Promise<Awaited<execa.ExecaChildProcess>> {
    const ignoredError = Symbol('ignoredExecError');
    let retries = 10;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        // Note: The `try...catch` statement is not used here,
        //       because the type of the `error` variable will only be `execa.ExecaError` if the `.catch()` method is used.
        const result = await fn().catch<typeof ignoredError>((error) => {
            if (retries-- && isSkip(error)) return ignoredError;
            throw error;
        });
        if (result !== ignoredError) return result;
    }
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
    // Set npm supporting the current Node.js to Corepack's "Last Known Good" release.
    // This allows specifying the version of npm to use when forced to run npm using the environment variable "COREPACK_ENABLE_STRICT".
    // Note: To avoid the "Error when performing the request" error, set all package managers other than npm to the "Last Known Good" release.
    await execa(
        'corepack',
        ['prepare', '--activate', ...corepackPackageManager.latestList],
        { env: { COREPACK_HOME } },
    );

    await Promise.all([
        execa('npm', ['run', 'build'], { cwd: PROJECT_ROOT }),
        fs
            .rm(CLI_DIR, { recursive: true, force: true })
            .then(() => fs.mkdir(CLI_DIR, { recursive: true }))
            .then(() =>
                fs.writeFile(path.resolve(CLI_DIR, 'package.json'), '{}'),
            ),
    ]);
    await execa('npm', ['install', '--no-save', PROJECT_ROOT], {
        cwd: CLI_DIR,
    });
});

describe.concurrent('CLI should add Git tag', () => {
    interface Case {
        cliArgs: readonly string[];
        expected: (
            version: string,
        ) => Partial<Awaited<execa.ExecaChildProcess>>;
    }

    test.each(
        Object.entries<Case>({
            normal: {
                cliArgs: [],
                expected: () => ({
                    stderr: '',
                }),
            },
            'with verbose output': {
                cliArgs: ['--verbose'],
                expected: (version) => ({
                    stderr: [
                        '',
                        `> git tag v${version} -m ${version}`,
                        '',
                        //
                    ].join('\n'),
                }),
            },
        }),
    )('%s', async (testName, { cliArgs, expected }) => {
        const { exec, version } = await initGit(
            tmpDir('CLI should add Git tag', testName),
        );

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });

        await expect(
            exec([CLI_PATH, ...cliArgs]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            stderr: '',
            ...expected(version),
        });

        await expect(
            exec([
                'git',
                'for-each-ref',
                '--format=%(objecttype) %(refname)',
                'refs/tags',
            ]),
            `Git annotated tag 'v${version}' should be added`,
        ).resolves.toMatchObject({
            stdout: `tag refs/tags/v${version}`,
        });
    });
});

describe.concurrent('CLI should not add Git tag with dry-run', () => {
    test.each(['-n', '--dry-run'])('%s', async (option) => {
        const { exec, version } = await initGit(
            tmpDir('CLI should not add Git tag with dry-run', option),
        );

        const gitTagResult = exec(['git', 'tag', '-l']).then(
            ({ stdout, stderr }) => ({ stdout, stderr }),
        );
        await expect(
            gitTagResult,
            'Git tag should not exist yet',
        ).resolves.toStrictEqual({ stdout: '', stderr: '' });

        await expect(
            exec([CLI_PATH, option]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            stderr: [
                'Dry Run enabled',
                '',
                `> git tag v${version} -m ${version}`,
                '',
            ].join('\n'),
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject(await gitTagResult);
    });
});

describe.concurrent(
    'CLI should complete successfully if Git tag has been added',
    () => {
        interface Case {
            cliArgs: readonly string[];
            expected: (
                version: string,
            ) => Partial<Awaited<execa.ExecaChildProcess>>;
        }

        test.each(
            Object.entries<Case>({
                normal: {
                    cliArgs: [],
                    expected: () => ({
                        stderr: '',
                    }),
                },
                'with verbose output': {
                    cliArgs: ['--verbose'],
                    expected: (version) => ({
                        stderr: [
                            '',
                            `> #git tag v${version} -m ${version}`,
                            `  # tag 'v${version}' already exists`,
                            '',
                        ].join('\n'),
                    }),
                },
                'with dry-run': {
                    cliArgs: ['--dry-run'],
                    expected: (version) => ({
                        stderr: [
                            'Dry Run enabled',
                            '',
                            `> #git tag v${version} -m ${version}`,
                            `  # tag 'v${version}' already exists`,
                            '',
                        ].join('\n'),
                    }),
                },
            }),
        )('%s', async (testName, { cliArgs, expected }) => {
            const { exec, version } = await initGit(
                tmpDir(
                    'CLI should complete successfully if Git tag has been added',
                    testName,
                ),
            );
            await exec(['git', 'tag', `v${version}`]);

            const gitTagResult = exec(['git', 'tag', '-l']).then(
                ({ stdout, stderr }) => ({ stdout, stderr }),
            );
            await expect(
                gitTagResult,
                `Git tag 'v${version}' should exist`,
            ).resolves.toStrictEqual({
                stdout: `v${version}`,
                stderr: '',
            });
            await expect(
                exec(['git', 'tag', `v${version}`]),
                'Overwriting tags with git cli should fail',
            ).rejects.toMatchObject({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                stderr: expect.stringContaining(
                    `tag 'v${version}' already exists`,
                ),
            });

            await expect(
                exec([CLI_PATH, ...cliArgs]),
                'CLI should exits successfully',
            ).resolves.toMatchObject({
                stdout: '',
                stderr: '',
                ...expected(version),
            });

            await expect(
                exec(['git', 'tag', '-l']),
                'Git tag should not change',
            ).resolves.toMatchObject(await gitTagResult);
        });
    },
);

test.concurrent(
    'CLI should fail if Git tag exists on different commits',
    async () => {
        const { exec, version } = await initGit(
            tmpDir('CLI should fail if Git tag exists on different commits'),
        );

        await exec(['git', 'tag', `v${version}`]);
        await exec(['git', 'commit', '--allow-empty', '-m', 'Second commit']);

        await expect(
            exec(['git', 'tag', `v${version}`]),
            'Overwriting tags with git cli should fail',
        ).rejects.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stderr: expect.stringContaining(`tag 'v${version}' already exists`),
        });

        await expect(exec([CLI_PATH]), 'CLI should fail').rejects.toMatchObject(
            {
                exitCode: 1,
                stdout: '',
                stderr: `Git tag 'v${version}' already exists`,
            },
        );
    },
);

test.concurrent(
    'CLI push flag should fail if there is no remote repository',
    async () => {
        const { exec, version } = await initGit(
            tmpDir(
                'CLI push flag should fail if there is no remote repository',
            ),
        );

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should fail',
        ).rejects.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stderr: expect.stringContaining(
                `'origin' does not appear to be a git repository`,
            ),
        });

        await expect(
            exec([CLI_PATH, '--push']),
            'CLI should try git push and should fail',
        ).rejects.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stderr: expect.stringContaining(
                `'origin' does not appear to be a git repository`,
            ),
        });

        await expect(
            exec([
                'git',
                'for-each-ref',
                '--format=%(objecttype) %(refname)',
                'refs/tags',
            ]),
            `Git annotated tag 'v${version}' should be added`,
        ).resolves.toMatchObject({
            stdout: `tag refs/tags/v${version}`,
        });
    },
);

describe.concurrent('CLI should add and push Git tag', () => {
    interface Case {
        cliArgs: readonly string[];
        expected: (
            version: string,
        ) => Partial<Awaited<execa.ExecaChildProcess>>;
    }

    test.each(
        Object.entries<Case>({
            normal: {
                cliArgs: [],
                expected: () => ({ stderr: '' }),
            },
            'with verbose output': {
                cliArgs: ['--verbose'],
                expected: (version) => ({
                    stderr: [
                        '',
                        `> git tag v${version} -m ${version}`,
                        `> git push origin v${version}`,
                        '',
                    ].join('\n'),
                }),
            },
        }),
    )('%s', async (testName, { cliArgs, expected }) => {
        const {
            exec,
            version,
            remote: { tagList },
        } = await initGit(tmpDir('CLI should add and push Git tag', testName), {
            useRemoteRepo: true,
        });

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        ).resolves.toSatisfy(() => true);

        await expect(
            exec([CLI_PATH, '--push', ...cliArgs]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            stderr: '',
            ...expected(version),
        });

        await expect(
            exec([
                'git',
                'for-each-ref',
                '--format=%(objecttype) %(refname)',
                'refs/tags',
            ]),
            `Git annotated tag 'v${version}' should be added`,
        ).resolves.toMatchObject({
            stdout: `tag refs/tags/v${version}`,
        });

        expect(
            tagList,
            `Git tag 'v${version}' should have been pushed`,
        ).toStrictEqual([`v${version}`]);
    });
});

test.concurrent(
    'CLI should not add and not push Git tag with dry-run',
    async () => {
        const {
            exec,
            version,
            remote: { tagList },
        } = await initGit(
            tmpDir('CLI should not add and not push Git tag with dry-run'),
            { useRemoteRepo: true },
        );

        const gitTagResult = exec(['git', 'tag', '-l']).then(
            ({ stdout, stderr }) => ({ stdout, stderr }),
        );
        await expect(
            gitTagResult,
            'Git tag should not exist yet',
        ).resolves.toStrictEqual({ stdout: '', stderr: '' });

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        ).resolves.toSatisfy(() => true);

        await expect(
            exec([CLI_PATH, '--push', '--dry-run']),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            stderr: [
                'Dry Run enabled',
                '',
                `> git tag v${version} -m ${version}`,
                `> git push origin v${version}`,
                '',
            ].join('\n'),
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject(await gitTagResult);
        expect(tagList, 'Git tag should not been pushed').toStrictEqual([]);
    },
);

test.concurrent('CLI should add and push single Git tag', async () => {
    const {
        exec,
        version,
        remote: { tagList },
    } = await initGit(tmpDir('CLI should add and push single Git tag'), {
        useRemoteRepo: true,
    });

    await exec(['git', 'tag', `v${version}-pre`]);
    await exec(['git', 'commit', '--allow-empty', '-m', 'Second commit']);
    await exec(['git', 'tag', 'hoge']);

    await expect(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should success',
    ).resolves.toSatisfy(() => true);

    await expect(
        exec([CLI_PATH, '--push']),
        'CLI should not output anything',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec([
            'git',
            'for-each-ref',
            '--format=%(objecttype) %(refname)',
            'refs/tags',
        ]),
        `Git annotated tag 'v${version}' should be added`,
    ).resolves.toMatchObject({
        stdout: [
            'commit refs/tags/hoge',
            `tag refs/tags/v${version}`,
            `commit refs/tags/v${version}-pre`,
        ].join('\n'),
    });

    expect(tagList, 'Git tag needs to push only one').toStrictEqual([
        `v${version}`,
    ]);
});

describe.concurrent.each(
    Object.entries<{
        optionList: readonly [string, ...string[]];
        expected: string;
    }>({
        version: {
            optionList: ['-V', '-v', '--version'],
            expected: `${PKG_DATA.name}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`,
        },
        help: {
            optionList: ['-h', '--help'],
            expected: [
                `${PKG_DATA.name} v${PKG_DATA.version}`,
                '',
                PKG_DATA.description,
                '',
                'Usage:',
                `  $ ${PKG_DATA.name} [options]`,
                '',
                'Options:',
                '  -V, -v, --version  Display version number ',
                '  -h, --help         Display this message ',
                '  --push             `git push` the added tag to the remote repository ',
                '  --verbose          show details of executed git commands ',
                '  -n, --dry-run      perform a trial run with no changes made ',
            ].join('\n'),
        },
    }),
)('CLI should to display %s', (testName, { optionList, expected }) => {
    test.each(optionList)('%s', async (option) => {
        const { exec } = await initGit(
            tmpDir(`CLI should to display`, testName, option),
        );

        const gitTagResult = exec(['git', 'tag', '-l']).then(
            ({ stdout, stderr }) => ({ stdout, stderr }),
        );
        await expect(
            gitTagResult,
            'Git tag should not exist yet',
        ).resolves.toStrictEqual({ stdout: '', stderr: '' });

        await expect(
            exec([CLI_PATH, option]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: expected,
            stderr: '',
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject(await gitTagResult);
    });
});

test.concurrent('CLI should not work with unknown options', async () => {
    const { exec } = await initGit(
        tmpDir('CLI should not work with unknown options'),
    );

    const gitTagResult = exec(['git', 'tag', '-l']).then(
        ({ stdout, stderr }) => ({ stdout, stderr }),
    );
    await expect(
        gitTagResult,
        'Git tag should not exist yet',
    ).resolves.toStrictEqual({ stdout: '', stderr: '' });

    const unknownOption = '--lololololololololololololololol';
    await expect(
        exec([CLI_PATH, unknownOption]),
        'CLI should fail',
    ).rejects.toMatchObject({
        exitCode: 1,
        stdout: '',
        stderr: [
            `unknown option: ${unknownOption}`,
            `Try \`${PKG_DATA.name} --help\` for valid options.`,
        ].join('\n'),
    });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject(await gitTagResult);
});

describe.concurrent('CLI should add Git tag with customized tag prefix', () => {
    interface Case {
        pkgJson?: Record<string, unknown>;
        commad: Record<
            'version' | 'getPrefix' | 'execCli',
            readonly [string, ...string[]]
        > & {
            setNewVersion: (
                newVersion: string,
            ) => readonly [string, ...string[]];
        };
        configFile: '.npmrc' | '.yarnrc';
    }

    const simpleTestCases = Object.entries<Case>({
        npm: {
            commad: {
                version: ['npm', '--version'],
                getPrefix: ['npm', 'config', 'get', 'tag-version-prefix'],
                execCli: ['npm', 'exec', '--no', PKG_DATA.name],
                setNewVersion: (newVersion) => ['npm', 'version', newVersion],
            },
            configFile: '.npmrc',
        },
        yarn: {
            pkgJson: {
                packageManager: 'yarn@1.22.19',
            },
            commad: {
                version: ['yarn', '--version'],
                getPrefix: ['yarn', 'config', 'get', 'version-tag-prefix'],
                execCli: ['yarn', 'run', PKG_DATA.name],
                setNewVersion: (newVersion) => [
                    'yarn',
                    'version',
                    '--new-version',
                    newVersion,
                ],
            },
            configFile: '.yarnrc',
        },
    }).concat(
        corepackPackageManager.pnpmList.map<[string, Case]>(
            (packageManager) => {
                const major = Number(
                    /^pnpm@(\d+)/.exec(packageManager)?.[1] ?? '0',
                );
                return [
                    packageManager.replace(/\+.+$/, ''),
                    {
                        pkgJson: {
                            packageManager,
                        },
                        commad: {
                            version: ['pnpm', '--version'],
                            getPrefix: [
                                'pnpm',
                                'config',
                                'get',
                                'tag-version-prefix',
                            ],
                            execCli:
                                major >= 6
                                    ? ['pnpm', 'exec', PKG_DATA.name]
                                    : ['pnpx', '--no-install', PKG_DATA.name],
                            setNewVersion: (newVersion) => [
                                'pnpm',
                                'version',
                                newVersion,
                            ],
                        },
                        configFile: '.npmrc',
                    },
                ];
            },
        ),
    );
    const fullTestCases = simpleTestCases.flatMap<
        readonly [testName: string, caseItem: Case]
    >(([testName, caseItem]) => {
        const toTestName = (
            testName: string,
            execCliCommand: readonly string[],
            pkgJson: Record<string, unknown> | undefined,
        ): string => {
            const npmScriptNameSet = new Set(
                Object.keys(pkgJson?.['scripts'] ?? {}),
            );
            return (
                execCliCommand
                    .filter((arg) => !/^-{1,2}[^-]/.test(arg))
                    .map((arg) =>
                        npmScriptNameSet.has(arg)
                            ? '{npm-script}'
                            : arg === PKG_DATA.name
                            ? '{command}'
                            : arg,
                    )
                    .join(' ') +
                (testName !== execCliCommand[0] ? ` (${testName})` : '')
            );
        };

        const caseList: Case[] = [
            caseItem,
            {
                ...caseItem,
                pkgJson: {
                    ...caseItem.pkgJson,
                    scripts: {
                        ...(typeof caseItem.pkgJson?.['scripts'] === 'object'
                            ? caseItem.pkgJson['scripts']
                            : {}),
                        'xxx-run-cli': PKG_DATA.name,
                    },
                },
                commad: {
                    ...caseItem.commad,
                    execCli: [caseItem.commad.version[0], 'run', 'xxx-run-cli'],
                },
            },
        ];
        return caseList.map((caseItem) => [
            toTestName(testName, caseItem.commad.execCli, caseItem.pkgJson),
            caseItem,
        ]);
    });

    const defaultPrefix = 'v';
    const testFn =
        (customPrefix: string | undefined, uniqueNameList: string[] = []) =>
        async (
            testName: string,
            { pkgJson, configFile, commad }: Case,
        ): Promise<void> => {
            const { exec, gitDirpath, version } = await initGit(
                tmpDir(
                    'CLI should add Git tag with customized tag prefix',
                    ...uniqueNameList,
                    testName,
                ),
            );
            const configValue: Record<typeof configFile, string> | undefined =
                typeof customPrefix === 'string'
                    ? {
                          '.npmrc': 'this-is-npm-tag-prefix-',
                          '.yarnrc': 'this-is-yarn-tag-prefix-',
                          [configFile]: customPrefix,
                      }
                    : undefined;
            const packageManager = (() => {
                const spec = pkgJson?.['packageManager'];
                if (typeof spec !== 'string') return null;
                const [, packageManagerType, packageManagerSemVer] =
                    /^([^@]+)@(.+)/.exec(spec) ?? [];
                if (!packageManagerType || !packageManagerSemVer) return null;
                return {
                    type: packageManagerType,
                    semver: new semver.SemVer(packageManagerSemVer),
                };
            })();
            const env: NodeJS.ProcessEnv = {
                COREPACK_HOME,
            };
            // On Windows, the pnpm command will fail if the "APPDATA" environment variable does not exist.
            // This is caused by pnpm's dependency "@pnpm/npm-conf".
            // see https://github.com/pnpm/npm-conf/blob/ff043813516e16597de96a787c710de0b15e9aa9/lib/defaults.js#L29-L30
            if (process.platform === 'win32' && packageManager?.type === 'pnpm')
                env['APPDATA'] = process.env['APPDATA'];
            const pnpmConfig =
                packageManager?.type !== 'pnpm'
                    ? undefined
                    : {
                          /**
                           * `true` if pnpm v7.20 or later.
                           *
                           * Starting with pnpm v7.20, the `pnpm config` command uses its own implementation that does not execute the `npm config` command.
                           * This implementation does not detect npm's built-in configuration, so it returns an empty value if the config setting does not exist in the ".npmrc" file.
                           * @see https://github.com/pnpm/pnpm/blob/v7.20.0/pnpm/CHANGELOG.md#7200
                           */
                          isNewPnpmConfig: semver.lte(
                              '7.20.0',
                              packageManager.semver,
                          ),
                          /**
                           * The "pnpm config get ..." command may return an empty value when it should return npm's built-in config.
                           * In such cases, it returns `true`.
                           */
                          async defaultValueIsEmpty(): Promise<boolean> {
                              // The "pnpm config get ..." command does not detect npm builtin config file.
                              // Therefore, an empty value is set to the expected value.
                              if (this.isNewPnpmConfig) return true;

                              // Older pnpm may not return npm builtin config even when using "npm config" commands internally.
                              // In such cases, an empty value is set to the expected value.
                              return exec(
                                  // We use "node-version" for testing because it has the following advantages:
                                  // + It cannot be set to an empty string. It is not affected by user or global configurations.
                                  // + It is supported since the earliest npm.
                                  ['pnpm', 'config', 'get', 'node-version'],
                                  {
                                      env: {
                                          ...env,
                                          COREPACK_ENABLE_STRICT: '0',
                                      },
                                  },
                              )
                                  .then(({ stdout }) => stdout === '')
                                  .catch(() => false);
                          },
                      };

            // Always use "npm install <folder>", even if the package manager is not npm.
            // This is because the "yarn add /path/to/local/folder" command may fail on GitHub Actions.
            await exec(['npm', 'install', '--no-save', PROJECT_ROOT]);
            await Promise.all([
                fs.writeFile(
                    path.join(gitDirpath, '.gitignore'),
                    'node_modules/',
                ),
                ...(configValue
                    ? [
                          fs.writeFile(
                              path.join(gitDirpath, '.npmrc'),
                              `tag-version-prefix="${configValue['.npmrc']}"`,
                          ),
                          fs.writeFile(
                              path.join(gitDirpath, '.yarnrc'),
                              `version-tag-prefix "${configValue['.yarnrc']}"`,
                          ),
                      ]
                    : []),
                // eslint-disable-next-line vitest/no-conditional-in-test
                pkgJson
                    ? fs.writeFile(
                          path.join(gitDirpath, 'package.json'),
                          JSON.stringify({ ...pkgJson, version }),
                      )
                    : null,
            ]);

            if (packageManager) {
                await expect(
                    exec(commad.version, { env }),
                ).resolves.toMatchObject({
                    stdout: packageManager.semver.version,
                    stderr: '',
                });
            }
            if (typeof customPrefix === 'string') {
                await expect(
                    exec(commad.getPrefix, {
                        env: pnpmConfig?.isNewPnpmConfig
                            ? env
                            : {
                                  ...env,
                                  // The old pnpm "pnpm config" command executes the "npm config" command internally.
                                  // see https://github.com/pnpm/pnpm/blob/v7.19.0/pnpm/src/pnpm.ts#L27-L64
                                  // Thus, we will set this environment variable so that npm can be used.
                                  // see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
                                  COREPACK_ENABLE_STRICT: '0',
                              },
                    }),
                    'version tag prefix should be defined in the config',
                ).resolves.toMatchObject({ stdout: customPrefix });
            } else {
                const defaultValueIsEmpty =
                    await pnpmConfig?.defaultValueIsEmpty();
                await expect(
                    exec(commad.getPrefix, {
                        env: pnpmConfig?.isNewPnpmConfig
                            ? env
                            : {
                                  ...env,
                                  // The old pnpm "pnpm config" command executes the "npm config" command internally.
                                  // see https://github.com/pnpm/pnpm/blob/v7.19.0/pnpm/src/pnpm.ts#L27-L64
                                  // Thus, we will set this environment variable so that npm can be used.
                                  // see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
                                  COREPACK_ENABLE_STRICT: '0',
                              },
                    }),
                    `version tag prefix should be "${defaultPrefix}"` +
                        (defaultValueIsEmpty
                            ? `, but the "${commandJoin(
                                  commad.getPrefix,
                              )}" command should not return anything`
                            : ''),
                ).resolves.toMatchObject({
                    stdout: defaultValueIsEmpty ? '' : defaultPrefix,
                });
            }
            await expect(
                exec(['git', 'tag', '-l']),
                'Git tag should not exist yet',
            ).resolves.toMatchObject({ stdout: '', stderr: '' });

            await expect(
                exec(commad.execCli, { env }),
                'CLI should exits successfully',
            ).resolves.toSatisfy(() => true);

            const tagName = `${customPrefix ?? defaultPrefix}${version}`;
            await expect(
                exec([
                    'git',
                    'for-each-ref',
                    '--format=%(objecttype) %(refname)',
                    'refs/tags',
                ]),
                `Git annotated tag '${tagName}' should be added`,
            ).resolves.toMatchObject({
                stdout: `tag refs/tags/${tagName}`,
            });

            const newVersion = `${version}1`;
            const newTagName = `${customPrefix ?? defaultPrefix}${newVersion}`;
            await exec(['git', 'add', '--all']);
            await exec(['git', 'commit', '-m', 'Second commit']);
            await exec(commad.setNewVersion(newVersion), {
                env: {
                    ...env,
                    // The "pnpm version" command executes the "npm version" command internally.
                    // see https://github.com/pnpm/pnpm/blob/v7.30.0/pnpm/src/pnpm.ts#L27-L61
                    // Thus, we will set this environment variable so that npm can be used.
                    // see https://github.com/nodejs/corepack/tree/v0.14.0#environment-variables
                    ...(packageManager?.type === 'pnpm' && {
                        COREPACK_ENABLE_STRICT: '0',
                    }),
                },
            });
            await expect(
                exec([
                    'git',
                    'for-each-ref',
                    '--format=%(objecttype) %(refname)',
                    'refs/tags',
                ]),
                'The "version" command in the package manager should also use the same prefix',
            ).resolves.toMatchObject({
                stdout: [
                    `tag refs/tags/${tagName}`,
                    `tag refs/tags/${newTagName}`,
                ].join('\n'),
            });
        };

    test.each(fullTestCases)('%s', testFn('my-awesome-pkg-v'));

    describe.concurrent('allow empty string prefix', () => {
        test.each(simpleTestCases)(
            '%s',
            testFn('', ['allow empty string prefix']),
        );
    });

    describe.concurrent('default prefix should be "v"', () => {
        test.each(simpleTestCases)(
            '%s',
            testFn(undefined, ['default prefix should be "v"']),
        );
    });
});
