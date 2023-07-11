import fs from 'node:fs/promises';
import path from 'node:path';

import type { ExecaChildProcess, Options as ExecaOptions } from 'execa';
import { execa } from 'execa';

import initGitServer from './git-server.js';
import { getRandomInt } from './index.js';
import type { PromiseValue, WithUndefinedProp } from './types.js';

export type ExecFunc = (
    cmd: readonly [string, ...string[]],
    options?: WithUndefinedProp<ExecaOptions, 'env'>,
) => ExecaChildProcess;
export type GitRemote = PromiseValue<ReturnType<typeof initGitServer>>;

interface InitGitOptions {
    execDefaultEnv?: NodeJS.ProcessEnv | undefined;
}

export async function initGit(
    dirpath: string,
    options: InitGitOptions & {
        useRemoteRepo: true;
    },
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    version: string;
    remote: GitRemote;
}>;
export async function initGit(
    dirpath: string,
    options?: InitGitOptions & {
        useRemoteRepo?: false | undefined;
    },
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    version: string;
    remote: null;
}>;
export async function initGit(
    dirpath: string,
    options?: InitGitOptions & {
        useRemoteRepo?: boolean | undefined;
    },
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    version: string;
    remote: null | GitRemote;
}> {
    const gitDirpath = path.resolve(dirpath);
    const execDefaultEnv = options?.execDefaultEnv;
    const exec: ExecFunc = ([command, ...args], options) =>
        execa(command, args, {
            cwd: gitDirpath,
            extendEnv: false,
            ...options,
            // By default, only the PATH environment variable and execDefaultEnv are inherited.
            // This is because some tests are broken by inheriting environment variables.
            env: {
                PATH: process.env['PATH'],
                ...execDefaultEnv,
                ...options?.env,
            },
        });
    const version = [
        getRandomInt(0, 99),
        getRandomInt(0, 99),
        getRandomInt(1, 99),
    ].join('.');

    const [, remote] = await Promise.all([
        (async () => {
            await fs.rm(gitDirpath, { recursive: true, force: true });
            await fs.mkdir(gitDirpath, { recursive: true });

            await exec(['git', 'init']);
            await exec(['git', 'config', 'user.email', 'foo@example.com']);
            await exec(['git', 'config', 'user.name', 'bar']);

            await fs.writeFile(
                path.join(gitDirpath, 'package.json'),
                JSON.stringify({ version }),
            );
            await exec(['git', 'add', '--all']);
            await exec(['git', 'commit', '-m', 'Initial commit']);
        })(),
        options?.useRemoteRepo ? initGitServer(`${gitDirpath}.remote`) : null,
    ]);

    if (remote) {
        await exec(['git', 'remote', 'add', 'origin', `${remote.remoteURL}/x`]);
    }

    return { exec, gitDirpath, version, remote };
}
/* eslint-enable */
