import test from 'ava';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as PKG_DATA from '../package.json';
import { execFileAsync, getRandomInt, rmrf } from './helpers';
import { initGit } from './helpers/git';

import escapeRegExp = require('escape-string-regexp');
import execa = require('execa');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const CLI_PATH = path.resolve(
    FIXTURES_DIR,
    'node_modules',
    '.bin',
    PKG_DATA.name,
);

function tmpDir(dirname: string): string {
    return path.resolve(__dirname, 'tmp', dirname);
}

test.before.skip(async () => {
    await execFileAsync('npm', ['run', 'build'], { cwd: PROJECT_ROOT });
    await Promise.all([
        rmrf(path.resolve(FIXTURES_DIR, 'package-lock.json')),
        rmrf(path.resolve(FIXTURES_DIR, 'node_modules')),
    ]);
    await execFileAsync('npm', ['install'], { cwd: FIXTURES_DIR });

    /*
     * Delete all npm environment variables
     * Note: If npm environment variables are set, testing may not proceed properly.
     */
    Object.keys(process.env)
        .filter((key) => /^npm_/i.test(key))
        .forEach((key) => {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete process.env[key];
        });
});

test.only('check npm version', async (t) => {
    // eslint-disable-next-line no-unused-vars
    for (const _ of Array(5)) {
        t.like(await execa('npm', ['--version']), {
            stdout: '7.24.2',
            stderr: '',
        });
    }
});

test.only('check yarn version', async (t) => {
    const { exec, gitDirpath } = await initGit(tmpDir('yarn1-ver'));

    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({
            packageManager: 'yarn@1.22.19',
        }),
    );

    // eslint-disable-next-line no-unused-vars
    for (const _ of Array(5)) {
        t.like(await exec(['yarn', '--version']), {
            stdout: '1.22.19',
            stderr: '',
        });
    }
});

if (
    Object.keys(process.env).some((key) => /^corepack[-_]available$/i.test(key))
) {
    test.only('check yarn2 version', async (t) => {
        const { exec, gitDirpath } = await initGit(tmpDir('yarn2-ver'));

        await fs.writeFile(
            path.join(gitDirpath, 'package.json'),
            JSON.stringify({
                packageManager: 'yarn@2.4.3',
            }),
        );

        // eslint-disable-next-line no-unused-vars
        for (const _ of Array(5)) {
            t.like(await exec(['yarn', '--version']), {
                stdout: '2.4.3',
                stderr: '',
            });
        }
    });

    test.only('check yarn3 version', async (t) => {
        const { exec, gitDirpath } = await initGit(tmpDir('yarn3-ver'));

        await fs.writeFile(
            path.join(gitDirpath, 'package.json'),
            JSON.stringify({
                packageManager: 'yarn@3.4.1',
            }),
        );

        // eslint-disable-next-line no-unused-vars
        for (const _ of Array(5)) {
            t.like(await exec(['yarn', '--version']), {
                stdout: '3.4.1',
                stderr: '',
            });
        }
    });

    test.only('check yarn4 version', async (t) => {
        const { exec, gitDirpath } = await initGit(tmpDir('yarn4-ver'));

        await fs.writeFile(
            path.join(gitDirpath, 'package.json'),
            JSON.stringify({
                packageManager: 'yarn@4.0.0-rc.40',
            }),
        );

        // eslint-disable-next-line no-unused-vars
        for (const _ of Array(5)) {
            t.like(await exec(['yarn', '--version']), {
                stdout: '4.0.0-rc.40',
                stderr: '',
            });
        }
    });

    test.only('check pnpm version', async (t) => {
        const { exec, gitDirpath } = await initGit(tmpDir('pnpm-ver'));

        await fs.writeFile(
            path.join(gitDirpath, 'package.json'),
            JSON.stringify({
                packageManager: 'pnpm@7.29.1',
            }),
        );

        // eslint-disable-next-line no-unused-vars
        for (const _ of Array(5)) {
            t.like(await exec(['pnpm', '--version']), {
                stdout: '7.29.1',
                stderr: '',
            });
        }
    });
}

test('CLI should add Git tag', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag'));

    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        async () =>
            t.like(
                await exec([CLI_PATH]),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should add Git tag with verbose output', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag-with-verbose'));

    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--verbose']);

        t.is(stdout, '');
        t.is(stderr, '\n> git tag v0.0.0 -m 0.0.0\n');
    }, 'CLI should exits successfully');

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should not add Git tag with dry-run', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag-with-dry-run'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    t.is(gitTags, '', 'Git tag should not exist yet');

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--dry-run']);

        t.is(stdout, '');
        t.is(stderr, 'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n');
    }, 'CLI should exits successfully');

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should complete successfully if Git tag has been added', async (t) => {
    const { exec } = await initGit(tmpDir('exists-git-tag-in-same-commit'));
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    t.regex(gitTags, /^v0\.0\.0$/m, 'Git tag v0.0.0 should exist');

    {
        const message = 'Overwriting tags with git cli should fail';
        const result = exec(['git', 'tag', 'v0.0.0']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(error.stderr, /tag 'v0\.0\.0' already exists/, message);
        });
    }

    await t.notThrowsAsync(
        async () =>
            t.like(
                await exec([CLI_PATH]),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should complete successfully if Git tag has been added with verbose output', async (t) => {
    const { exec } = await initGit(
        tmpDir('exists-git-tag-in-same-commit-with-verbose'),
    );
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    t.regex(gitTags, /^v0\.0\.0$/m, 'Git tag v0.0.0 should exist');

    {
        const message = 'Overwriting tags with git cli should fail';
        const result = exec(['git', 'tag', 'v0.0.0']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(error.stderr, /tag 'v0\.0\.0' already exists/, message);
        });
    }

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--verbose']);

        t.is(stdout, '');
        t.is(
            stderr,
            `\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n`,
        );
    }, 'CLI should exits successfully');

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should complete successfully if Git tag has been added with dry-run', async (t) => {
    const { exec } = await initGit(
        tmpDir('exists-git-tag-in-same-commit-with-dry-run'),
    );
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    t.regex(gitTags, /^v0\.0\.0$/m, 'Git tag v0.0.0 should exist');

    {
        const message = 'Overwriting tags with git cli should fail';
        const result = exec(['git', 'tag', 'v0.0.0']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(error.stderr, /tag 'v0\.0\.0' already exists/, message);
        });
    }

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--dry-run']);

        t.is(stdout, '');
        t.is(
            stderr,
            `Dry Run enabled\n\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n`,
        );
    }, 'CLI should exits successfully');

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should fail if Git tag exists on different commits', async (t) => {
    const { exec } = await initGit(tmpDir('exists-git-tag-in-other-commit'));

    await exec(['git', 'tag', 'v0.0.0']);
    await exec(['git', 'commit', '--allow-empty', '-m', 'Second commit']);

    {
        const message = 'Overwriting tags with git cli should fail';
        const result = exec(['git', 'tag', 'v0.0.0']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(error.stderr, /tag 'v0\.0\.0' already exists/, message);
        });
    }

    {
        const message = 'CLI should fail';
        const error = await t.throwsAsync(exec([CLI_PATH]), undefined, message);
        t.like(
            error,
            {
                exitCode: 1,
                stdout: '',
                stderr: "Git tag 'v0.0.0' already exists",
            },
            message,
        );
    }
});

test('CLI should read version and add tag', async (t) => {
    const { exec, gitDirpath } = await initGit(tmpDir('add-random-git-tag'));
    const major = getRandomInt(0, 99);
    const minor = getRandomInt(1, 23);
    const patch = getRandomInt(0, 9);
    const version = [major, minor, patch].join('.');
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/v${major}\.${minor}\.${patch}$`,
        'm',
    );

    await exec(['git', 'tag', 'v0.0.0']);

    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({ version }),
    );
    await exec(['git', 'add', '--all']);
    await exec(['git', 'commit', '-m', 'Update version']);

    t.notRegex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git tag v${version} should not exist yet`,
    );

    await t.notThrowsAsync(
        async () =>
            t.like(
                await exec([CLI_PATH]),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag v${version} should be added`,
    );
});

test('CLI push flag should fail if there is no remote repository', async (t) => {
    const { exec } = await initGit(tmpDir('push-fail-git-tag'));

    {
        const message = 'Git push should fail';
        const result = exec(['git', 'push', '--dry-run', 'origin', 'HEAD']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(
                error.stderr,
                /'origin' does not appear to be a git repository/,
                message,
            );
        });
    }

    {
        const message = 'CLI should try git push and should fail';
        const result = exec([CLI_PATH, '--push']);
        await t.throwsAsync(result, undefined, message);
        await result.catch((error) => {
            t.regex(
                error.stderr,
                /'origin' does not appear to be a git repository/,
                message,
            );
        });
    }

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should add and push Git tag', async (t) => {
    const { exec, remote } = await initGit(
        tmpDir('push-success-git-tag'),
        true,
    );

    {
        const { tagList } = remote;

        await t.notThrowsAsync(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        );

        await t.notThrowsAsync(
            async () =>
                t.like(
                    await exec([CLI_PATH, '--push']),
                    { stdout: '', stderr: '' },
                    'CLI should not output anything',
                ),
            'CLI should exits successfully',
        );

        t.regex(
            (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
            /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/,
            'Git annotated tag v0.0.0 should be added',
        );

        t.deepEqual(
            tagList,
            ['v0.0.0'],
            'Git tag v0.0.0 should have been pushed',
        );
    }
});

test('CLI should add and push Git tag with verbose output', async (t) => {
    const { exec, remote } = await initGit(
        tmpDir('push-success-git-tag-with-verbose'),
        true,
    );

    {
        const { tagList } = remote;

        await t.notThrowsAsync(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        );

        await t.notThrowsAsync(async () => {
            const { stdout, stderr } = await exec([
                CLI_PATH,
                '--push',
                '--verbose',
            ]);

            t.is(stdout, '');
            t.is(
                stderr,
                // prettier-ignore
                '\n> git tag v0.0.0 -m 0.0.0\n' +
                    '> git push origin v0.0.0\n',
            );
        }, 'CLI should exits successfully');

        t.regex(
            (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
            /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/,
            'Git annotated tag v0.0.0 should be added',
        );

        t.deepEqual(
            tagList,
            ['v0.0.0'],
            'Git tag v0.0.0 should have been pushed',
        );
    }
});

test('CLI should not add and not push Git tag with dry-run', async (t) => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-success-git-tag-with-dry-run'), true);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    await t.notThrowsAsync(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should success',
    );

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([
            CLI_PATH,
            '--push',
            '--dry-run',
        ]);

        t.is(stdout, '');
        t.is(
            stderr,
            'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n> git push origin v0.0.0\n',
        );
    }, 'CLI should exits successfully');

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
    t.deepEqual(tagList, [], 'Git tag should not been pushed');
});

test('CLI should add and push single Git tag', async (t) => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-single-git-tag'), true);

    await exec(['git', 'tag', 'v0.0.0-pre']);
    await exec(['git', 'commit', '--allow-empty', '-m', 'Second commit']);
    await exec(['git', 'tag', 'hoge']);

    await t.notThrowsAsync(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should success',
    );

    await t.notThrowsAsync(
        async () =>
            t.like(
                await exec([CLI_PATH, '--push']),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/m,
        'Git annotated tag v0.0.0 should be added',
    );

    t.deepEqual(tagList, ['v0.0.0'], 'Git tag needs to push only one');
});

test('CLI should to display version', async (t) => {
    const { exec } = await initGit(tmpDir('display-version'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;

    for (const option of ['--version', '-v', '-V']) {
        await t.notThrowsAsync(async () => {
            const { stdout, stderr } = await exec([CLI_PATH, option]);
            t.is(
                stdout,
                `${PKG_DATA.name}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`,
                `CLI should output version number in stdout / "${option}" option`,
            );
            t.is(
                stderr,
                '',
                `CLI should not output anything in stderr / "${option}" option`,
            );
        }, `CLI should exits successfully / "${option}" option`);

        t.is(
            (await exec(['git', 'tag', '-l'])).stdout,
            gitTags,
            `Git tag should not change / "${option}" option`,
        );
    }
});

test('CLI should to display help', async (t) => {
    const { exec } = await initGit(tmpDir('display-help'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--help']);
        t.is(
            stdout,
            [
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
            'CLI should output help in stdout',
        );
        t.is(stderr, '', 'CLI should not output anything in stderr');
    }, 'CLI should exits successfully');

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should not work with unknown options', async (t) => {
    const { exec } = await initGit(tmpDir('unknown-option'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;

    const unknownOption = '--lololololololololololololololol';
    {
        const message = 'CLI should fail';
        const error = await t.throwsAsync(
            exec([CLI_PATH, '--lololololololololololololololol']),
            undefined,
            message,
        );
        t.like(
            error,
            {
                exitCode: 1,
                stdout: '',
                stderr: [
                    `unknown option: ${unknownOption}`,
                    `Try \`${PKG_DATA.name} --help\` for valid options.`,
                ].join('\n'),
            },
            message,
        );
    }

    t.is(
        (await exec(['git', 'tag', '-l'])).stdout,
        gitTags,
        'Git tag should not change',
    );
});

test('CLI should add Git tag with customized tag prefix by npm', async (t) => {
    const { exec, gitDirpath } = await initGit(tmpDir('custom-tag-prefix-npm'));
    const customPrefix = 'npm-tag-';

    await t.notThrowsAsync(exec(['npm', 'install', PROJECT_ROOT]));
    await fs.writeFile(
        path.join(gitDirpath, '.npmrc'),
        `tag-version-prefix=${customPrefix}`,
    );
    await fs.writeFile(
        path.join(gitDirpath, '.yarnrc'),
        'version-tag-prefix this-is-yarn-tag-prefix-',
    );

    t.is(
        (await exec(['npm', 'config', 'get', 'tag-version-prefix'])).stdout,
        customPrefix,
        'should define tag-version-prefix in npm-config',
    );
    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['npm', 'exec', '--no', PKG_DATA.name]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}0.0.0`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag '${tagName}' should be added`,
    );
});

test('CLI should add Git tag with customized tag prefix by npm / run npm-script', async (t) => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-npm.run-script'),
    );
    const customPrefix = 'npm-tag-';

    await t.notThrowsAsync(exec(['npm', 'install', PROJECT_ROOT]));
    await fs.writeFile(
        path.join(gitDirpath, '.npmrc'),
        `tag-version-prefix=${customPrefix}`,
    );
    await fs.writeFile(
        path.join(gitDirpath, '.yarnrc'),
        'version-tag-prefix this-is-yarn-tag-prefix-',
    );
    const version = '1.1.0';
    const npmScriptName = 'xxx-run-cli';
    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({
            version,
            scripts: {
                [npmScriptName]: PKG_DATA.name,
            },
        }),
    );

    t.is(
        (await exec(['npm', 'config', 'get', 'tag-version-prefix'])).stdout,
        customPrefix,
        'should define tag-version-prefix in npm-config',
    );
    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['npm', 'run', npmScriptName]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag '${tagName}' should be added`,
    );
});

test('CLI should add Git tag with customized tag prefix by yarn', async (t) => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-yarn'),
    );
    const customPrefix = 'yarn-tag-';

    await t.notThrowsAsync(exec(['npm', 'install', PROJECT_ROOT]));
    await fs.writeFile(
        path.join(gitDirpath, '.npmrc'),
        'tag-version-prefix=this-is-npm-tag-prefix-',
    );
    await fs.writeFile(
        path.join(gitDirpath, '.yarnrc'),
        `version-tag-prefix ${customPrefix}`,
    );
    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({
            version: '0.0.0',
            packageManager: 'yarn@1.22.19',
        }),
    );

    t.is(
        (await exec(['yarn', 'config', 'get', 'version-tag-prefix'])).stdout,
        customPrefix,
        'should define version-tag-prefix in yarn config',
    );
    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['yarn', 'run', PKG_DATA.name]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}0.0.0`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag '${tagName}' should be added`,
    );
});

test('CLI should add Git tag with customized tag prefix by yarn / run npm-script', async (t) => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-yarn.run-script'),
    );
    const customPrefix = 'yarn-tag-';

    await t.notThrowsAsync(exec(['npm', 'install', PROJECT_ROOT]));
    await fs.writeFile(
        path.join(gitDirpath, '.npmrc'),
        'tag-version-prefix=this-is-npm-tag-prefix-',
    );
    await fs.writeFile(
        path.join(gitDirpath, '.yarnrc'),
        `version-tag-prefix ${customPrefix}`,
    );
    const version = '1.0.2';
    const npmScriptName = 'xxx-run-cli';
    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({
            version,
            scripts: {
                [npmScriptName]: PKG_DATA.name,
            },
            packageManager: 'yarn@1.22.19',
        }),
    );

    t.is(
        (await exec(['yarn', 'config', 'get', 'version-tag-prefix'])).stdout,
        customPrefix,
        'should define version-tag-prefix in yarn config',
    );
    t.like(
        await exec(['git', 'tag', '-l']),
        { stdout: '', stderr: '' },
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['yarn', 'run', npmScriptName]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag '${tagName}' should be added`,
    );
});
