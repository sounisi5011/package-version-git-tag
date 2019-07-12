import test from 'ava';
import childProcess from 'child_process';
import del from 'del';
import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import { promisify } from 'util';

import * as PKG_DATA from '../package.json';
import initGitServer from './helpers/git-server';
import { PromiseValue } from './helpers/types';

const GIT_ROOT_DIR = path.resolve(__dirname, 'tmp');
const CLI_PATH = path.resolve(__dirname, '..', PKG_DATA.bin);

const writeFile = promisify(fs.writeFile);

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

interface ExecFunc {
    (cmd: readonly string[], options?: childProcess.ExecFileOptions): Promise<{
        stdout: string;
        stderr: string;
    }>;
}

function execGenerator(gitDirpath: string): ExecFunc {
    return ([command, ...args], options) => {
        return new Promise((resolve, reject) => {
            const process = childProcess.execFile(command, args, {
                cwd: gitDirpath,
                ...options,
            });
            const stdoutList: unknown[] = [];
            const stderrList: unknown[] = [];

            if (process.stdout) {
                process.stdout.on('data', data => {
                    stdoutList.push(data);
                });
            }

            if (process.stderr) {
                process.stderr.on('data', data => {
                    stderrList.push(data);
                });
            }

            process.on('close', (code, signal) => {
                const stdout = stdoutList.join('');
                const stderr = stderrList.join('');

                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    const err = new Error(
                        [
                            `Command failed code=${code} signal=${signal}`,
                            '',
                            'stdout:',
                            stdout.replace(/^|\r\n?|\n/g, '$&o '),
                            '',
                            'stderr:',
                            stderr.replace(/^|\r\n?|\n/g, '$&e '),
                        ].join('\n'),
                    );
                    Object.assign(err, {
                        name: 'CommandFailedError',
                        code,
                    });
                    reject(err);
                }
            });

            process.on('error', err => {
                reject(err);
            });
        });
    };
}

async function initGit(
    dirName: string,
    useRemoteRepo: true,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: PromiseValue<ReturnType<typeof initGitServer>>;
}>;
async function initGit(
    dirName: string,
    useRemoteRepo: false,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: null;
}>;
async function initGit(
    dirName: string,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: null;
}>;
async function initGit(
    dirName: string,
    useRemoteRepo: boolean = false,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: null | PromiseValue<ReturnType<typeof initGitServer>>;
}> {
    const gitDirpath = path.join(GIT_ROOT_DIR, dirName);
    const exec = execGenerator(gitDirpath);

    const [, remote] = await Promise.all([
        (async () => {
            await del(path.join(gitDirpath, '*'), { dot: true });
            await makeDir(gitDirpath);

            await exec(['git', 'init']);

            await writeFile(
                path.join(gitDirpath, 'package.json'),
                JSON.stringify({ version: '0.0.0' }),
            );
            await exec(['git', 'add', '--all']);
            await exec(['git', 'commit', '-m', 'Initial commit']);
        })(),
        (async () => {
            if (!useRemoteRepo) {
                return null;
            }
            return initGitServer(
                path.join(GIT_ROOT_DIR, `${gitDirpath}.remote`),
            );
        })(),
    ]);

    if (remote) {
        await exec(['git', 'remote', 'add', 'origin', `${remote.remoteURL}/x`]);
    }

    return { exec, gitDirpath, remote };
}

test('CLI should add Git tag', async t => {
    const { exec } = await initGit('not-exists-git-tag');

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
        (await exec(['git', 'tag', '-l'])).stdout,
        /^v0\.0\.0$/m,
        'Git tag v0.0.0 should be added',
    );
});

test('CLI should complete successfully if Git tag has been added', async t => {
    const { exec } = await initGit('exists-git-tag-in-same-commit');
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

test('CLI should fail if Git tag exists on different commits', async t => {
    const { exec } = await initGit('exists-git-tag-in-other-commit');

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

test('CLI should read version and add tag', async t => {
    const { exec, gitDirpath } = await initGit('add-random-git-tag');
    const major = getRandomInt(0, 99);
    const minor = getRandomInt(1, 23);
    const patch = getRandomInt(0, 9);
    const version = [major, minor, patch].join('.');
    const versionTagRegExp = new RegExp(
        `^v${major}\\.${minor}\\.${patch}$`,
        'm',
    );

    await exec(['git', 'tag', 'v0.0.0']);

    await writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({ version }),
    );
    await exec(['git', 'add', '--all']);
    await exec(['git', 'commit', '-m', 'Update version']);

    t.notRegex(
        (await exec(['git', 'tag', '-l'])).stdout,
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
        (await exec(['git', 'tag', '-l'])).stdout,
        versionTagRegExp,
        `Git tag v${version} should be added`,
    );
});

test('CLI push flag should fail if there is no remote repository', async t => {
    const { exec } = await initGit('push-fail-git-tag');

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
        (await exec(['git', 'tag', '-l'])).stdout,
        /^v0\.0\.0$/m,
        'Git tag v0.0.0 should be added',
    );
});

test('CLI should add and push Git tag', async t => {
    const {
        exec,
        remote: { tagList },
    } = await initGit('push-success-git-tag', true);

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
        (await exec(['git', 'tag', '-l'])).stdout,
        /^v0\.0\.0$/m,
        'Git tag v0.0.0 should be added',
    );

    t.deepEqual(tagList, ['v0.0.0'], 'Git tag v0.0.0 should have been pushed');
});

test('CLI should add and push single Git tag', async t => {
    const {
        exec,
        remote: { tagList },
    } = await initGit('push-single-git-tag', true);

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
        (await exec(['git', 'tag', '-l'])).stdout,
        /^v0\.0\.0$/m,
        'Git tag v0.0.0 should be added',
    );

    t.deepEqual(tagList, ['v0.0.0'], 'Git tag needs to push only one');
});
