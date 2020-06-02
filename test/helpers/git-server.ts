import * as path from 'path';

import del = require('del');
import Server = require('node-git-server');

const PORT = {
    MIN: 49152,
    MAX: 65535,
};

const usedPort = new Set<number>();

export default async function (
    dirpath: string,
): Promise<{ remoteURL: string; repos: Server; tagList: string[] }> {
    const tagList: string[] = [];

    await del(path.join(dirpath, '*'), { dot: true });

    const repos = new Server(dirpath, {
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
        const result = await new Promise((resolve, reject) => {
            repos.listen(port, resolve);
            /**
             * Note: The try...catch statement does not catch the error for the http/https module.
             * @see https://github.com/expressjs/express/issues/2856#issuecomment-172566787
             */
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
            .catch((error) => {
                if (error.code !== 'EADDRINUSE') {
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
