import escapeRegExp from 'escape-string-regexp';
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

test('CLI should add Git tag', async () => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag'));

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec([CLI_PATH]),
        'CLI should not output anything',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/),
    });
});

test('CLI should add Git tag with verbose output', async () => {
    const { exec } = await initGit(tmpDir('not-exists-git-tag-with-verbose'));

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec([CLI_PATH, '--verbose']),
        'CLI should exits successfully',
    ).resolves.toMatchObject({
        stdout: '',
        stderr: '\n> git tag v0.0.0 -m 0.0.0\n',
    });

    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/),
    });
});

describe('CLI should not add Git tag with dry-run', () => {
    it.each(['-n', '--dry-run'])('%s', async (option) => {
        const { exec } = await initGit(
            tmpDir('not-exists-git-tag-with-dry-run'),
        );

        const gitTagsResult = exec(['git', 'tag', '-l']);
        await expect(
            gitTagsResult,
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });
        const { stdout: gitTags } = await gitTagsResult;

        await expect(
            exec([CLI_PATH, option]),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            stderr: 'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n',
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject({
            stdout: gitTags,
        });
    });
});

test('CLI should complete successfully if Git tag has been added', async () => {
    const { exec } = await initGit(tmpDir('exists-git-tag-in-same-commit'));
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    expect(gitTags, 'Git tag v0.0.0 should exist').toMatch(/^v0\.0\.0$/m);

    await expect(
        exec(['git', 'tag', 'v0.0.0']),
        'Overwriting tags with git cli should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringMatching(/tag 'v0\.0\.0' already exists/),
    });

    await expect(
        exec([CLI_PATH]),
        'CLI should not output anything',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject({ stdout: gitTags });
});

test('CLI should complete successfully if Git tag has been added with verbose output', async () => {
    const { exec } = await initGit(
        tmpDir('exists-git-tag-in-same-commit-with-verbose'),
    );
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    expect(gitTags, 'Git tag v0.0.0 should exist').toMatch(/^v0\.0\.0$/m);

    await expect(
        exec(['git', 'tag', 'v0.0.0']),
        'Overwriting tags with git cli should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringMatching(/tag 'v0\.0\.0' already exists/),
    });

    await expect(
        exec([CLI_PATH, '--verbose']),
        'CLI should exits successfully',
    ).resolves.toMatchObject({
        stdout: '',
        stderr: `\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n`,
    });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject({ stdout: gitTags });
});

test('CLI should complete successfully if Git tag has been added with dry-run', async () => {
    const { exec } = await initGit(
        tmpDir('exists-git-tag-in-same-commit-with-dry-run'),
    );
    await exec(['git', 'tag', 'v0.0.0']);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    expect(gitTags, 'Git tag v0.0.0 should exist').toMatch(/^v0\.0\.0$/m);

    await expect(
        exec(['git', 'tag', 'v0.0.0']),
        'Overwriting tags with git cli should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringMatching(/tag 'v0\.0\.0' already exists/),
    });

    await expect(
        exec([CLI_PATH, '--dry-run']),
        'CLI should exits successfully',
    ).resolves.toMatchObject({
        stdout: '',
        stderr: `Dry Run enabled\n\n> #git tag v0.0.0 -m 0.0.0\n  # tag 'v0.0.0' already exists\n`,
    });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject({ stdout: gitTags });
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
        stderr: expect.stringMatching(/tag 'v0\.0\.0' already exists/),
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

    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git tag v${version} should not exist yet`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.not.stringMatching(versionTagRegExp),
    });

    await expect(
        exec([CLI_PATH]),
        'CLI should not output anything',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git annotated tag v${version} should be added`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(versionTagRegExp),
    });
});

test('CLI push flag should fail if there is no remote repository', async () => {
    const { exec } = await initGit(tmpDir('push-fail-git-tag'));

    await expect(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringMatching(
            /'origin' does not appear to be a git repository/,
        ),
    });

    await expect(
        exec([CLI_PATH, '--push']),
        'CLI should try git push and should fail',
    ).rejects.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stderr: expect.stringMatching(
            /'origin' does not appear to be a git repository/,
        ),
    });

    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/),
    });
});

test('CLI should add and push Git tag', async () => {
    const { exec, remote } = await initGit(
        tmpDir('push-success-git-tag'),
        true,
    );

    {
        const { tagList } = remote;

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        ).resolves.toSatisfy(() => true);

        await expect(
            exec([CLI_PATH, '--push']),
            'CLI should not output anything',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });

        await expect(
            exec(['git', 'for-each-ref', 'refs/tags']),
            'Git annotated tag v0.0.0 should be added',
        ).resolves.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/),
        });

        expect(tagList, 'Git tag v0.0.0 should have been pushed').toStrictEqual(
            ['v0.0.0'],
        );
    }
});

test('CLI should add and push Git tag with verbose output', async () => {
    const { exec, remote } = await initGit(
        tmpDir('push-success-git-tag-with-verbose'),
        true,
    );

    {
        const { tagList } = remote;

        await expect(
            exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
            'Git push should success',
        ).resolves.toSatisfy(() => true);

        await expect(
            exec([CLI_PATH, '--push', '--verbose']),
            'CLI should exits successfully',
        ).resolves.toMatchObject({
            stdout: '',
            // prettier-ignore
            stderr: '\n> git tag v0.0.0 -m 0.0.0\n' +
                '> git push origin v0.0.0\n',
        });

        await expect(
            exec(['git', 'for-each-ref', 'refs/tags']),
            'Git annotated tag v0.0.0 should be added',
        ).resolves.toMatchObject({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/),
        });

        expect(tagList, 'Git tag v0.0.0 should have been pushed').toStrictEqual(
            ['v0.0.0'],
        );
    }
});

test('CLI should not add and not push Git tag with dry-run', async () => {
    const {
        exec,
        remote: { tagList },
    } = await initGit(tmpDir('push-success-git-tag-with-dry-run'), true);

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;
    await expect(
        exec(['git', 'push', '--dry-run', 'origin', 'HEAD']),
        'Git push should success',
    ).resolves.toSatisfy(() => true);

    await expect(
        exec([CLI_PATH, '--push', '--dry-run']),
        'CLI should exits successfully',
    ).resolves.toMatchObject({
        stdout: '',
        stderr: 'Dry Run enabled\n\n> git tag v0.0.0 -m 0.0.0\n> git push origin v0.0.0\n',
    });

    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not change',
    ).resolves.toMatchObject({ stdout: gitTags });
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
        exec(['git', 'for-each-ref', 'refs/tags']),
        'Git annotated tag v0.0.0 should be added',
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(/^\w+\s+tag\s+refs\/tags\/v0\.0\.0$/m),
    });

    expect(tagList, 'Git tag needs to push only one').toStrictEqual(['v0.0.0']);
});

describe('CLI should to display version', () => {
    it.each(['-V', '-v', '--version'])('%s', async (option) => {
        const { exec } = await initGit(tmpDir('display-version'));

        const gitTagsResult = exec(['git', 'tag', '-l']);
        await expect(
            gitTagsResult,
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });
        const { stdout: gitTags } = await gitTagsResult;

        await expect(
            exec([CLI_PATH, option]),
            'CLI should output version number',
        ).resolves.toMatchObject({
            stdout: `${PKG_DATA.name}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`,
            stderr: '',
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject({
            stdout: gitTags,
        });
    });
});

describe('CLI should to display help', () => {
    it.each(['-h', '--help'])('%s', async (option) => {
        const { exec } = await initGit(tmpDir('display-help'));

        const gitTagsResult = exec(['git', 'tag', '-l']);
        await expect(
            gitTagsResult,
            'Git tag should not exist yet',
        ).resolves.toMatchObject({ stdout: '', stderr: '' });
        const { stdout: gitTags } = await gitTagsResult;

        await expect(
            exec([CLI_PATH, option]),
            'CLI should output help',
        ).resolves.toMatchObject({
            stdout: [
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
            stderr: '',
        });

        await expect(
            exec(['git', 'tag', '-l']),
            'Git tag should not change',
        ).resolves.toMatchObject({ stdout: gitTags });
    });
});

test('CLI should not work with unknown options', async () => {
    const { exec } = await initGit(tmpDir('unknown-option'));

    const gitTags = (await exec(['git', 'tag', '-l'])).stdout;

    const unknownOption = '--lololololololololololololololol';
    await expect(
        exec([CLI_PATH, '--lololololololololololololololol']),
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
    ).resolves.toMatchObject({ stdout: gitTags });
});

test('CLI should add Git tag with customized tag prefix by npm', async () => {
    const { exec, gitDirpath } = await initGit(tmpDir('custom-tag-prefix-npm'));
    const customPrefix = 'npm-tag-';

    await expect(
        exec(['npm', 'install', '--no-save', PROJECT_ROOT]),
    ).resolves.toSatisfy(() => true);
    await fs.writeFile(
        path.join(gitDirpath, '.npmrc'),
        `tag-version-prefix=${customPrefix}`,
    );
    await fs.writeFile(
        path.join(gitDirpath, '.yarnrc'),
        'version-tag-prefix this-is-yarn-tag-prefix-',
    );

    await expect(
        exec(['npm', 'config', 'get', 'tag-version-prefix']),
        'should define tag-version-prefix in npm-config',
    ).resolves.toMatchObject({ stdout: customPrefix });
    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['npm', 'exec', '--no', PKG_DATA.name]),
        'CLI should exits successfully',
    ).resolves.toSatisfy(() => true);

    const tagName = `${customPrefix}0.0.0`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git annotated tag '${tagName}' should be added`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(versionTagRegExp),
    });
});

test('CLI should add Git tag with customized tag prefix by npm / run npm-script', async () => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-npm.run-script'),
    );
    const customPrefix = 'npm-tag-';

    await expect(
        exec(['npm', 'install', '--no-save', PROJECT_ROOT]),
    ).resolves.toSatisfy(() => true);
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

    await expect(
        exec(['npm', 'config', 'get', 'tag-version-prefix']),
        'should define tag-version-prefix in npm-config',
    ).resolves.toMatchObject({ stdout: customPrefix });
    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['npm', 'run', npmScriptName]),
        'CLI should exits successfully',
    ).resolves.toSatisfy(() => true);

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git annotated tag '${tagName}' should be added`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(versionTagRegExp),
    });
});

test('CLI should add Git tag with customized tag prefix by yarn', async () => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-yarn'),
    );
    const customPrefix = 'yarn-tag-';

    await expect(
        exec(['npm', 'install', '--no-save', PROJECT_ROOT]),
    ).resolves.toSatisfy(() => true);
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

    await expect(
        exec(['yarn', 'config', 'get', 'version-tag-prefix']),
        'should define version-tag-prefix in yarn config',
    ).resolves.toMatchObject({ stdout: customPrefix });
    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['yarn', 'run', PKG_DATA.name]),
        'CLI should exits successfully',
    ).resolves.toSatisfy(() => true);

    const tagName = `${customPrefix}0.0.0`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git annotated tag '${tagName}' should be added`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(versionTagRegExp),
    });
});

test('CLI should add Git tag with customized tag prefix by yarn / run npm-script', async () => {
    const { exec, gitDirpath } = await initGit(
        tmpDir('custom-tag-prefix-yarn.run-script'),
    );
    const customPrefix = 'yarn-tag-';

    await expect(
        exec(['npm', 'install', '--no-save', PROJECT_ROOT]),
    ).resolves.toSatisfy(() => true);
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

    await expect(
        exec(['yarn', 'config', 'get', 'version-tag-prefix']),
        'should define version-tag-prefix in yarn config',
    ).resolves.toMatchObject({ stdout: customPrefix });
    await expect(
        exec(['git', 'tag', '-l']),
        'Git tag should not exist yet',
    ).resolves.toMatchObject({ stdout: '', stderr: '' });

    await expect(
        exec(['yarn', 'run', npmScriptName]),
        'CLI should exits successfully',
    ).resolves.toSatisfy(() => true);

    const tagName = `${customPrefix}${version}`;
    const versionTagRegExp = new RegExp(
        String.raw`^\w+\s+tag\s+refs/tags/${escapeRegExp(tagName)}$`,
    );
    await expect(
        exec(['git', 'for-each-ref', 'refs/tags']),
        `Git annotated tag '${tagName}' should be added`,
    ).resolves.toMatchObject({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stdout: expect.stringMatching(versionTagRegExp),
    });
});
