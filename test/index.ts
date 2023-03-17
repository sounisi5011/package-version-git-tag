import execa from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';
import { beforeAll, describe, expect, it, test } from 'vitest';

import * as PKG_DATA from '../package.json';
import { getRandomInt } from './helpers';
import { initGit } from './helpers/git';

const PROJECT_ROOT = path.resolve(__dirname, '..');

function tmpDir(dirname: string): string {
    return path.resolve(__dirname, '.temp', dirname);
}

const CLI_DIR = tmpDir('.cli');
const CLI_PATH = path.resolve(CLI_DIR, 'node_modules', '.bin', PKG_DATA.name);

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

describe('CLI should add Git tag', () => {
    interface Case {
        tmpDirName: string;
        cliArgs: readonly string[];
        expected: Partial<Awaited<execa.ExecaChildProcess>>;
    }

    it.each(
        Object.entries<Case>({
            normal: {
                tmpDirName: 'not-exists-git-tag',
                cliArgs: [],
                expected: {
                    stderr: '',
                },
            },
            'with verbose output': {
                tmpDirName: 'not-exists-git-tag-with-verbose',
                cliArgs: ['--verbose'],
                expected: {
                    stderr: [
                        '',
                        '> git tag v0.0.0 -m 0.0.0',
                        '',
                        //
                    ].join('\n'),
                },
            },
        }),
    )('%s', async (_, { tmpDirName, cliArgs, expected }) => {
        const { exec } = await initGit(tmpDir(tmpDirName));

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });

        await expect(
            exec([CLI_PATH, ...cliArgs]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({ stdout: '', stderr: '', ...expected });

        await expect(
            exec([
                'git',
                'for-each-ref',
                '--format=%(objecttype) %(refname)',
                'refs/tags',
            ]),
            'Git annotated tag v0.0.0 should be added',
        ).resolves.toMatchObject({
            stdout: 'tag refs/tags/v0.0.0',
        });
    });
});

describe('CLI should not add Git tag with dry-run', () => {
    it.each(['-n', '--dry-run'])('%s', async (option) => {
        const { exec } = await initGit(
            tmpDir('not-exists-git-tag-with-dry-run'),
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
                '> git tag v0.0.0 -m 0.0.0',
                '',
            ].join('\n'),
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject(await gitTagResult);
    });
});

describe('CLI should complete successfully if Git tag has been added', () => {
    interface Case {
        tmpDirName: string;
        cliArgs: readonly string[];
        expected: Partial<Awaited<execa.ExecaChildProcess>>;
    }

    it.each(
        Object.entries<Case>({
            normal: {
                tmpDirName: 'exists-git-tag-in-same-commit',
                cliArgs: [],
                expected: {
                    stderr: '',
                },
            },
            'with verbose output': {
                tmpDirName: 'exists-git-tag-in-same-commit-with-verbose',
                cliArgs: ['--verbose'],
                expected: {
                    stderr: [
                        '',
                        '> #git tag v0.0.0 -m 0.0.0',
                        `  # tag 'v0.0.0' already exists`,
                        '',
                    ].join('\n'),
                },
            },
            'with dry-run': {
                tmpDirName: 'exists-git-tag-in-same-commit-with-dry-run',
                cliArgs: ['--dry-run'],
                expected: {
                    stderr: [
                        'Dry Run enabled',
                        '',
                        '> #git tag v0.0.0 -m 0.0.0',
                        `  # tag 'v0.0.0' already exists`,
                        '',
                    ].join('\n'),
                },
            },
        }),
    )('%s', async (_, { tmpDirName, cliArgs, expected }) => {
        const { exec } = await initGit(tmpDir(tmpDirName));
        await exec(['git', 'tag', 'v0.0.0']);

        const gitTagResult = exec(['git', 'tag', '-l']).then(
            ({ stdout, stderr }) => ({ stdout, stderr }),
        );
        await expect(
            gitTagResult,
            'Git tag v0.0.0 should exist',
        ).resolves.toStrictEqual({
            stdout: 'v0.0.0',
            stderr: '',
        });
        await expect(
            exec(['git', 'tag', 'v0.0.0']),
            'Overwriting tags with git cli should fail',
        ).rejects.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stderr: expect.stringContaining(`tag 'v0.0.0' already exists`),
        });

        await expect(
            exec([CLI_PATH, ...cliArgs]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({ stdout: '', stderr: '', ...expected });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject(await gitTagResult);
    });
});

test('CLI should fail if Git tag exists on different commits', async () => {
    const { exec } = await initGit(tmpDir('exists-git-tag-in-other-commit'));

    await exec(['git', 'tag', 'v0.0.0']);
    await exec(['git', 'commit', '--allow-empty', '-m', 'Second commit']);

    await expect(
        exec(['git', 'tag', 'v0.0.0']),
        'Overwriting tags with git cli should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringContaining(`tag 'v0.0.0' already exists`),
    });

    await expect(exec([CLI_PATH]), 'CLI should fail').rejects.toMatchObject({
        exitCode: 1,
        stdout: '',
        stderr: "Git tag 'v0.0.0' already exists",
    });
});

test('CLI should read version and add tag', async () => {
    const { exec, gitDirpath } = await initGit(tmpDir('add-random-git-tag'));
    const major = getRandomInt(0, 99);
    const minor = getRandomInt(1, 23);
    const patch = getRandomInt(0, 9);
    const version = [major, minor, patch].join('.');

    await exec(['git', 'tag', 'v0.0.0']);

    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({ version }),
    );
    await exec(['git', 'add', '--all']);
    await exec(['git', 'commit', '-m', 'Update version']);

    await expect(
        exec([
            'git',
            'for-each-ref',
            '--format=%(objecttype) %(refname)',
            'refs/tags',
        ]),
        `Git tag v${version} should not exist yet`,
    ).resolves.toMatchObject({
        stdout: 'commit refs/tags/v0.0.0',
    });

    await expect(
        exec([CLI_PATH]),
        'CLI should not output anything',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec([
            'git',
            'for-each-ref',
            '--format=%(objecttype) %(refname)',
            'refs/tags',
        ]),
        `Git annotated tag v${version} should be added`,
    ).resolves.toMatchObject({
        stdout: [
            'commit refs/tags/v0.0.0',
            `tag refs/tags/v${version}`,
            //
        ].join('\n'),
    });
});

test('CLI push flag should fail if there is no remote repository', async () => {
    const { exec } = await initGit(tmpDir('push-fail-git-tag'));

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
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        stdout: 'tag refs/tags/v0.0.0',
    });
});

describe('CLI should add and push Git tag', () => {
    interface Case {
        tmpDirName: string;
        cliArgs: readonly string[];
        expected: Partial<Awaited<execa.ExecaChildProcess>>;
    }

    it.each(
        Object.entries<Case>({
            normal: {
                tmpDirName: 'push-success-git-tag',
                cliArgs: [],
                expected: { stderr: '' },
            },
            'with verbose output': {
                tmpDirName: 'push-success-git-tag-with-verbose',
                cliArgs: ['--verbose'],
                expected: {
                    stderr: [
                        '',
                        '> git tag v0.0.0 -m 0.0.0',
                        '> git push origin v0.0.0',
                        '',
                    ].join('\n'),
                },
            },
        }),
    )('%s', async (_, { tmpDirName, cliArgs, expected }) => {
        const {
            exec,
            remote: { tagList },
        } = await initGit(tmpDir(tmpDirName), true);

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        ).resolves.toSatisfy(() => true);

        await expect(
            exec([CLI_PATH, '--push', ...cliArgs]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({ stdout: '', stderr: '', ...expected });

        await expect(
            exec([
                'git',
                'for-each-ref',
                '--format=%(objecttype) %(refname)',
                'refs/tags',
            ]),
            'Git annotated tag v0.0.0 should be added',
        ).resolves.toMatchObject({
            stdout: 'tag refs/tags/v0.0.0',
        });

        expect(tagList, 'Git tag v0.0.0 should have been pushed').toStrictEqual(
            ['v0.0.0'],
        );
    });
});

test('CLI should not add and not push Git tag with dry-run', async () => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-success-git-tag-with-dry-run'), true);

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
            '> git tag v0.0.0 -m 0.0.0',
            '> git push origin v0.0.0',
            '',
        ].join('\n'),
    });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject(await gitTagResult);
    expect(tagList, 'Git tag should not been pushed').toStrictEqual([]);
});

test('CLI should add and push single Git tag', async () => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-single-git-tag'), true);

    await exec(['git', 'tag', 'v0.0.0-pre']);
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
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        stdout: [
            'commit refs/tags/hoge',
            'tag refs/tags/v0.0.0',
            'commit refs/tags/v0.0.0-pre',
        ].join('\n'),
    });

    expect(tagList, 'Git tag needs to push only one').toStrictEqual(['v0.0.0']);
});

describe.each(
    Object.entries<{
        tmpDirName: string;
        optionList: readonly [string, ...string[]];
        expected: string;
    }>({
        version: {
            tmpDirName: 'display-version',
            optionList: ['-V', '-v', '--version'],
            expected: `${PKG_DATA.name}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`,
        },
        help: {
            tmpDirName: 'display-help',
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
)('CLI should to display %s', (_, { tmpDirName, optionList, expected }) => {
    it.each(optionList)('%s', async (option) => {
        const { exec } = await initGit(tmpDir(tmpDirName));

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

test('CLI should not work with unknown options', async () => {
    const { exec } = await initGit(tmpDir('unknown-option'));

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

describe('CLI should add Git tag with customized tag prefix', () => {
    interface Case {
        tmpDirName: string;
        pkgJson?: Record<string, unknown>;
        configFile: '.npmrc' | '.yarnrc';
        getPrefixCommad: readonly [string, ...string[]];
        execCommad: readonly [string, ...string[]];
    }

    it.each(
        Object.entries<Case>({
            'npm exec {command}': {
                tmpDirName: 'custom-tag-prefix-npm',
                configFile: '.npmrc',
                getPrefixCommad: ['npm', 'config', 'get', 'tag-version-prefix'],
                execCommad: ['npm', 'exec', '--no', PKG_DATA.name],
            },
            'npm run {npm-script}': {
                tmpDirName: 'custom-tag-prefix-npm.run-script',
                pkgJson: {
                    scripts: {
                        'xxx-run-cli': PKG_DATA.name,
                    },
                },
                configFile: '.npmrc',
                getPrefixCommad: ['npm', 'config', 'get', 'tag-version-prefix'],
                execCommad: ['npm', 'run', 'xxx-run-cli'],
            },
            'yarn run {command}': {
                tmpDirName: 'custom-tag-prefix-yarn',
                pkgJson: {
                    packageManager: 'yarn@1.22.19',
                },
                configFile: '.yarnrc',
                getPrefixCommad: [
                    'yarn',
                    'config',
                    'get',
                    'version-tag-prefix',
                ],
                execCommad: ['yarn', 'run', PKG_DATA.name],
            },
            'yarn run {npm-script}': {
                tmpDirName: 'custom-tag-prefix-yarn.run-script',
                pkgJson: {
                    scripts: {
                        'xxx-run-cli': PKG_DATA.name,
                    },
                    packageManager: 'yarn@1.22.19',
                },
                configFile: '.yarnrc',
                getPrefixCommad: [
                    'yarn',
                    'config',
                    'get',
                    'version-tag-prefix',
                ],
                execCommad: ['yarn', 'run', 'xxx-run-cli'],
            },
        }),
    )(
        '%s',
        async (
            _,
            { tmpDirName, pkgJson, configFile, getPrefixCommad, execCommad },
        ) => {
            const { exec, gitDirpath } = await initGit(tmpDir(tmpDirName));
            const customPrefix = 'my-awesome-pkg-v';
            const configValue: Record<typeof configFile, string> = {
                '.npmrc': 'this-is-npm-tag-prefix-',
                '.yarnrc': 'this-is-yarn-tag-prefix-',
                [configFile]: customPrefix,
            };

            await exec(['npm', 'install', '--no-save', PROJECT_ROOT]);
            await Promise.all([
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
                          JSON.stringify({ ...pkgJson, version: '0.0.0' }),
                      )
                    : null,
            ]);

            await expect(
                exec(getPrefixCommad),
                'version tag prefix should be defined in the config',
            ).resolves.toMatchObject({ stdout: customPrefix });
            await expect(
                exec(['git', 'tag', '-l']),
                'Git tag should not exist yet',
            ).resolves.toMatchObject({ stdout: '', stderr: '' });

            await expect(
                exec(execCommad),
                'CLI should exits successfully',
            ).resolves.toSatisfy(() => true);

            const tagName = `${customPrefix}0.0.0`;
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
        },
    );
});
