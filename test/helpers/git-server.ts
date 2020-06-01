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

    for (let port = PORT.MIN; port <= PORT.MAX; port++) {
        if (usedPort.has(port)) {
            continue;
        }
        try {
            await new Promise((resolve) => repos.listen(port, resolve));
            usedPort.add(port);
            return {
                remoteURL: `http://localhost:${port}`,
                repos,
                tagList,
            };
        } catch (error) {
            if (error.code !== 'EADDRINUSE') {
                throw error;
            }
        }
    }

    throw new Error(
        `Could not start git server; no available port in ${PORT.MIN} to ${PORT.MAX}`,
    );
}
