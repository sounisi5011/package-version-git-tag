import slugify from '@sindresorhus/slugify';
import execa from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';
import { beforeAll, describe, expect, test } from 'vitest';

import * as PKG_DATA from '../package.json';
import { initGit } from './helpers/git';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEST_TMP_DIR = path.resolve(__dirname, '.temp');
const CLI_DIR = path.resolve(TEST_TMP_DIR, '.cli');
const CLI_PATH = path.resolve(CLI_DIR, 'node_modules', '.bin', PKG_DATA.name);

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

beforeAll(async () => {
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
            'getPrefix' | 'execCli',
            readonly [string, ...string[]]
        > & {
            setNewVersion: (
                newVersion: string,
            ) => readonly [string, ...string[]];
        };
        configFile: '.npmrc' | '.yarnrc';
    }

    test.each(
        Object.entries<Case>({
            'npm exec {command}': {
                commad: {
                    getPrefix: ['npm', 'config', 'get', 'tag-version-prefix'],
                    execCli: ['npm', 'exec', '--no', PKG_DATA.name],
                    setNewVersion: (newVersion) => [
                        'npm',
                        'version',
                        newVersion,
                    ],
                },
                configFile: '.npmrc',
            },
            'npm run {npm-script}': {
                pkgJson: {
                    scripts: {
                        'xxx-run-cli': PKG_DATA.name,
                    },
                },
                commad: {
                    getPrefix: ['npm', 'config', 'get', 'tag-version-prefix'],
                    execCli: ['npm', 'run', 'xxx-run-cli'],
                    setNewVersion: (newVersion) => [
                        'npm',
                        'version',
                        newVersion,
                    ],
                },
                configFile: '.npmrc',
            },
            'yarn run {command}': {
                pkgJson: {
                    packageManager: 'yarn@1.22.19',
                },
                commad: {
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
            'yarn run {npm-script}': {
                pkgJson: {
                    scripts: {
                        'xxx-run-cli': PKG_DATA.name,
                    },
                    packageManager: 'yarn@1.22.19',
                },
                commad: {
                    getPrefix: ['yarn', 'config', 'get', 'version-tag-prefix'],
                    execCli: ['yarn', 'run', 'xxx-run-cli'],
                    setNewVersion: (newVersion) => [
                        'yarn',
                        'version',
                        '--new-version',
                        newVersion,
                    ],
                },
                configFile: '.yarnrc',
            },
        }),
    )('%s', async (testName, { pkgJson, configFile, commad }) => {
        const { exec, gitDirpath, version } = await initGit(
            tmpDir(
                'CLI should add Git tag with customized tag prefix',
                testName,
            ),
        );
        const customPrefix = 'my-awesome-pkg-v';
        const configValue: Record<typeof configFile, string> = {
            '.npmrc': 'this-is-npm-tag-prefix-',
            '.yarnrc': 'this-is-yarn-tag-prefix-',
            [configFile]: customPrefix,
        };

        // Use the "npm install <folder>" command even if the package manager is yarn.
        // This is because the "yarn add /path/to/local/folder" command may fail on GitHub Actions.
        await exec(['npm', 'install', '--no-save', PROJECT_ROOT]);
        await Promise.all([
            fs.writeFile(path.join(gitDirpath, '.gitignore'), 'node_modules/'),
            fs.writeFile(
                path.join(gitDirpath, '.npmrc'),
                `tag-version-prefix=${configValue['.npmrc']}`,
            ),
            fs.writeFile(
                path.join(gitDirpath, '.yarnrc'),
                `version-tag-prefix ${configValue['.yarnrc']}`,
            ),
            // eslint-disable-next-line vitest/no-conditional-in-test
            pkgJson
                ? fs.writeFile(
                      path.join(gitDirpath, 'package.json'),
                      JSON.stringify({ ...pkgJson, version }),
                  )
                : null,
        ]);

        await expect(
            exec(commad.getPrefix),
            'version tag prefix should be defined in the config',
        ).resolves.toMatchObject({ stdout: customPrefix });
        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });

        await expect(
            exec(commad.execCli),
            'CLI should exits successfully',
        ).resolves.toSatisfy(() => true);

        const tagName = `${customPrefix}${version}`;
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
        await exec(['git', 'add', '--all']);
        await exec(['git', 'commit', '-m', 'Second commit']);
        await exec(commad.setNewVersion(newVersion));
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
                `tag refs/tags/${customPrefix}${newVersion}`,
            ].join('\n'),
        });
    });
});
