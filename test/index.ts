import test from 'ava';
import childProcess from 'child_process';
import del from 'del';
import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import { promisify } from 'util';

import * as PKG_DATA from '../package.json';

const GIT_ROOT_DIR = path.resolve(__dirname, 'tmp');
const CLI_PATH = path.resolve(__dirname, '..', PKG_DATA.bin);

const writeFile = promisify(fs.writeFile);

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

async function initGit(dirName: string): Promise<ExecFunc> {
    const gitDirpath = path.join(GIT_ROOT_DIR, dirName);
    const exec = execGenerator(gitDirpath);

    await del(path.join(gitDirpath, '*'), { dot: true });
    await makeDir(gitDirpath);

    await exec(['git', 'init']);

    await writeFile(
        path.join(gitDirpath, 'package.json'),
        JSON.stringify({ version: '0.0.0' }),
    );
    await exec(['git', 'add', '--all']);
    await exec(['git', 'commit', '-m', 'Initial commit']);

    return exec;
}

test.serial('CLI should add Git tag', async t => {
    const exec = await initGit('not-exists-git-tag');

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

test.serial(
    'CLI should complete successfully if Git tag has been added',
    async t => {
        const exec = await initGit('exists-git-tag-in-same-commit');
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
    },
);

test.serial(
    'CLI should fail if Git tag exists on different commits',
    async t => {
        const exec = await initGit('exists-git-tag-in-other-commit');

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
    },
);
