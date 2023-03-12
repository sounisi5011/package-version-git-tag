import * as fs from 'fs/promises';
import * as path from 'path';

import { rmrf } from '.';
import execa = require('execa');
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
    useRemoteRepo: true,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: GitRemote;
}>;
export async function initGit(
    dirpath: string,
    useRemoteRepo?: false | undefined,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: null;
}>;
export async function initGit(
    dirpath: string,
    useRemoteRepo: boolean = false,
): Promise<{
    exec: ExecFunc;
    gitDirpath: string;
    remote: null | GitRemote;
}> {
    const gitDirpath = path.resolve(dirpath);
    const exec: ExecFunc = ([command, ...args], options) =>
        execa(command, args, {
            cwd: gitDirpath,
            ...options,
        });

    const [, remote] = await Promise.all([
        (async () => {
            await rmrf(gitDirpath);
            await fs.mkdir(gitDirpath, { recursive: true });

            await exec(['git', 'init']);
            await exec(['git', 'config', 'user.email', 'foo@example.com']);
            await exec(['git', 'config', 'user.name', 'bar']);

            await fs.writeFile(
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
            return initGitServer(`${gitDirpath}.remote`);
        })(),
    ]);

    if (remote) {
        await exec(['git', 'remote', 'add', 'origin', `${remote.remoteURL}/x`]);
    }

    return { exec, gitDirpath, remote };
}
/* eslint-enable */
