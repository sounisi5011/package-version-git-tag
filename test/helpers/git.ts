import execa from 'execa';
import fs from 'fs/promises';
import path from 'path';

import { getRandomInt } from '.';
import initGitServer from './git-server';
import type { PromiseValue } from './types';

export type ExecFunc = (
    cmd: readonly [string, ...string[]],
    options?: execa.Options,
) => execa.ExecaChildProcess;
export type GitRemote = PromiseValue<ReturnType<typeof initGitServer>>;

/* eslint-disable import/export */
export async function initGit(
    dirpath: string,
    options: {
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
    options?: {
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
    options?: {
        useRemoteRepo?: boolean | undefined;
    },
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    version: string;
    remote: null | GitRemote;
}> {
    const gitDirpath = path.resolve(dirpath);
    const exec: ExecFunc = ([command, ...args], options) =>
        execa(command, args, {
            cwd: gitDirpath,
            extendEnv: false,
            ...options,
            // By default, only the PATH environment variable is inherited.
            // This is because some tests are broken by inheriting environment variables.
            env: { PATH: process.env['PATH'], ...options?.env },
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
