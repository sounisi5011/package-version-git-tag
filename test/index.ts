import test from 'ava';
import * as fs from 'fs/promises';
import * as path from 'path';

import * as PKG_DATA from '../package.json';
import { execFileAsync, getRandomInt, rmrf } from './helpers';
import { initGit } from './helpers/git';

import escapeRegExp = require('escape-string-regexp');

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

test.before(async () => {
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

test('CLI should add Git tag', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag'));

    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        async () =>
            t.deepEqual(
                await exec([CLI_PATH]),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0\n$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should add Git tag with verbose output', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag-with-verbose'));

    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--verbose']);

        t.is(stdout, '');
        t.is(stderr, '\n> git tag v0.0.0 -m 0.0.0\n\n');
    }, 'CLI should exits successfully');

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0\n$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should not add Git tag with dry-run', async (t) => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag-with-dry-run'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    t.regex(gitTags, /^[\r\n]*$/, 'Git tag should not exist yet');

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--dry-run']);

        t.is(stdout, '');
        t.is(stderr, 'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n\n');
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

    await t.throwsAsync(
        exec(['git', 'tag', 'v0.0.0']),
        {
            name: 'CommandFailedError',
            message: /tag 'v0\.0\.0' already exists/,
        },
        'Overwriting tags with git cli should fail',
    );

    await t.notThrowsAsync(
        async () =>
            t.deepEqual(
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

    await t.throwsAsync(
        exec(['git', 'tag', 'v0.0.0']),
        {
            name: 'CommandFailedError',
            message: /tag 'v0\.0\.0' already exists/,
        },
        'Overwriting tags with git cli should fail',
    );

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--verbose']);

        t.is(stdout, '');
        t.is(
            stderr,
            `\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n\n`,
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

    await t.throwsAsync(
        exec(['git', 'tag', 'v0.0.0']),
        {
            name: 'CommandFailedError',
            message: /tag 'v0\.0\.0' already exists/,
        },
        'Overwriting tags with git cli should fail',
    );

    await t.notThrowsAsync(async () => {
        const { stdout, stderr } = await exec([CLI_PATH, '--dry-run']);

        t.is(stdout, '');
        t.is(
            stderr,
            `Dry Run enabled\n\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n\n`,
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

    await t.throwsAsync(
        exec(['git', 'tag', 'v0.0.0']),
        {
            name: 'CommandFailedError',
            message: /tag 'v0\.0\.0' already exists/,
        },
        'Overwriting tags with git cli should fail',
    );

    await t.throwsAsync(
        exec([CLI_PATH]),
        {
            name: 'CommandFailedError',
            message: /tag 'v0\.0\.0' already exists/,
        },
        'CLI should fail',
    );
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
            t.deepEqual(
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

    await t.throwsAsync(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        {
            name: 'CommandFailedError',
            message: /'origin' does not appear to be a git repository/,
        },
        'Git push should fail',
    );

    await t.throwsAsync(
        exec([CLI_PATH, '--push']),
        {
            name: 'CommandFailedError',
            message: /'origin' does not appear to be a git repository/,
        },
        'CLI should try git push and should fail',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0\n$/,
        'Git annotated tag v0.0.0 should be added',
    );
});

test('CLI should add and push Git tag', async (t) => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-success-git-tag'), true);

    await t.notThrowsAsync(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should success',
    );

    await t.notThrowsAsync(
        async () =>
            t.deepEqual(
                await exec([CLI_PATH, '--push']),
                { stdout: '', stderr: '' },
                'CLI should not output anything',
            ),
        'CLI should exits successfully',
    );

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0\n$/,
        'Git annotated tag v0.0.0 should be added',
    );

    t.deepEqual(tagList, ['v0.0.0'], 'Git tag v0.0.0 should have been pushed');
});

test('CLI should add and push Git tag with verbose output', async (t) => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-success-git-tag-with-verbose'), true);

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
            [
                '',
                '> git tag v0.0.0 -m 0.0.0',
                '> git push origin v0.0.0',
                '',
                '',
            ].join('\n'),
        );
    }, 'CLI should exits successfully');

    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        /^\w+\s+tag\s+refs\/tags\/v0\.0\.0\n$/,
        'Git annotated tag v0.0.0 should be added',
    );

    t.deepEqual(tagList, ['v0.0.0'], 'Git tag v0.0.0 should have been pushed');
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
            'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n> git push origin v0.0.0\n\n',
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
            t.deepEqual(
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
                `${PKG_DATA.name}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}\n`,
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
                '',
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
    await t.throwsAsync(
        exec([CLI_PATH, '--lololololololololololololololol']),
        {
            name: 'CommandFailedError',
            message: new RegExp(
                `^stderr:\n${escapeRegExp(
                    [
                        `unknown option: ${unknownOption}`,
                        `Try \`${PKG_DATA.name} --help\` for valid options.`,
                    ]
                        .map((line) => `e ${line}`)
                        .join('\n'),
                )}$`,
                'm',
            ),
        },
        'CLI should fail',
    );

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
        `${customPrefix}\n`,
        'should define tag-version-prefix in npm-config',
    );
    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['npm', 'exec', '--no', PKG_DATA.name]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}0.0.0`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}\n$`,
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
        `${customPrefix}\n`,
        'should define tag-version-prefix in npm-config',
    );
    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['npm', 'run', npmScriptName]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}\n$`,
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
    const version = '0.0.0';
    await fs.writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({
            version,
            packageManager: 'yarn@1.22.19',
        }),
    );

    t.is(
        (await exec(['yarn', 'config', 'get', 'version-tag-prefix'])).stdout,
        `${customPrefix}\n`,
        'should define version-tag-prefix in yarn config',
    );
    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['yarn', 'run', PKG_DATA.name]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}\n$`,
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
        `${customPrefix}\n`,
        'should define version-tag-prefix in yarn config',
    );
    t.regex(
        (await exec(['git', 'tag', '-l'])).stdout,
        /^[\r\n]*$/,
        'Git tag should not exist yet',
    );

    await t.notThrowsAsync(
        exec(['yarn', 'run', npmScriptName]),
        'CLI should exits successfully',
    );

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}\n$`,
    );
    t.regex(
        (await exec(['git', 'for-each-ref', 'refs/tags'])).stdout,
        versionTagRegExp,
        `Git annotated tag '${tagName}' should be added`,
    );
});
