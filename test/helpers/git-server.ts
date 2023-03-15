import * as fs from 'fs/promises';
import { Git, GitEvents } from 'node-git-server';

import { isObject } from '../../src/utils';

const PORT = {
    MIN: 49152,
    MAX: 65535,
};

const usedPort = new Set<number>();

export default async function (
    dirpath: string,
): Promise<{ remoteURL: string; repos: Git; tagList: string[] }> {
    const tagList: string[] = [];

    await fs.rm(dirpath, { recursive: true, force: true });
    await fs.mkdir(dirpath, { recursive: true });

    const repos: Git & GitEvents = new Git(dirpath, {
        autoCreate: true,
    });

    repos.on('tag', (tag) => {
        tagList.push(tag.version);
        tag.accept();
    });

    const errors: Error[] = [];
    for (let port = PORT.MIN; port <= PORT.MAX; port++) {
        if (usedPort.has(port)) {
            continue;
        }
        const result = await new Promise<void>((resolve, reject) => {
            repos.listen(port, { type: 'http' }, resolve);
            /**
             * Note: The try...catch statement does not catch the error for the http/https module.
             * @see https://github.com/expressjs/express/issues/2856#issuecomment-172566787
             */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            repos.server?.on('error', reject);
        })
            .then(() => {
                usedPort.add(port);
                return {
                    remoteURL: `http://localhost:${port}`,
                    repos,
                    tagList,
                };
            })
            .catch((error: unknown) => {
                if (
                    isObject(error) &&
                    error instanceof Error &&
                    error['code'] !== 'EADDRINUSE'
                ) {
                    errors.push(error);
                }
            });
        if (result) {
            return result;
        }
    }

    const lastError = errors.pop();
    if (lastError) {
        throw lastError;
    } else {
        throw new Error(
            `Could not start git server; no available port in ${PORT.MIN} to ${PORT.MAX}`,
        );
    }
}
