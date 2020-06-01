import type * as childProcess from 'child_process';

import crossSpawn = require('cross-spawn');

export interface ExecFunc {
    (cmd: readonly string[], options?: childProcess.ExecFileOptions): Promise<{
        stdout: string;
        stderr: string;
    }>;
}

export function execGenerator(gitDirpath: string): ExecFunc {
    return ([command, ...args], options) => {
        return new Promise((resolve, reject) => {
            const process = crossSpawn(command, args, {
                cwd: gitDirpath,
                ...options,
            });
            const stdoutList: unknown[] = [];
            const stderrList: unknown[] = [];

            if (process.stdout) {
                process.stdout.on('data', (data) => {
                    stdoutList.push(data);
                });
            }

            if (process.stderr) {
                process.stderr.on('data', (data) => {
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

            process.on('error', (err) => {
                reject(err);
            });
        });
    };
}
