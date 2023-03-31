import path from 'path';

import { isHeadTag, push, setTag, tagExists } from './git';
import { endPrintVerbose, isPkgData, readJSONFile } from './utils';
import { getConfig } from './utils/config';

export interface Options {
    push?: boolean | undefined;
    verbose?: boolean | undefined;
    dryRun?: boolean | undefined;
}

async function getVersionTagData(cwd: string): Promise<{
    tagName: string;
    message: string;
}> {
    const projectPkgPath = path.join(cwd, 'package.json');
    const projectPkgData = await readJSONFile(projectPkgPath);

    if (isPkgData(projectPkgData)) {
        const { version } = projectPkgData;

        /**
         * @see https://github.com/sindresorhus/np/blob/v5.1.3/source/util.js#L51-L65
         * @see https://github.com/npm/cli/blob/v6.13.0/lib/version.js#L311
         * @see https://github.com/yarnpkg/yarn/blob/v1.19.1/src/cli/commands/version.js#L194
         */
        const prefix = await getConfig(cwd, {
            npm: 'tag-version-prefix',
            yarn: 'version-tag-prefix',
        });

        /**
         * @see https://github.com/npm/cli/blob/v6.13.0/lib/version.js#L311
         * @see https://github.com/yarnpkg/yarn/blob/v1.19.1/src/cli/commands/version.js#L206
         */
        const tagName = `${prefix}${version}`;

        /**
         * @see https://github.com/npm/cli/blob/v6.13.0/lib/version.js#L296
         * @see https://github.com/yarnpkg/yarn/blob/v1.19.1/src/cli/commands/version.js#L191
         */
        const message = (
            await getConfig(cwd, {
                npm: 'message',
                yarn: 'version-git-message',
            })
        ).replace(/%s/g, version);

        return { tagName, message };
    }

    throw new Error('Failed to find version tag name.');
}

async function gitTagAlreadyExists(
    versionTagName: string,
    tagMessage: string,
    opts: Options,
): Promise<void> {
    if (!(await isHeadTag(versionTagName))) {
        throw new Error(`Git tag '${versionTagName}' already exists`);
    }

    if (opts.verbose) {
        await setTag(versionTagName, {
            message: tagMessage,
            debug: (commandText) =>
                `> #${commandText}\n  # tag '${versionTagName}' already exists`,
            dryRun: true,
        });
    }
}

async function main(opts: Options): Promise<void> {
    if (opts.dryRun) {
        console.error('Dry Run enabled');
        opts.verbose = true;
    }

    const cwd = process.cwd();
    const { tagName: versionTagName, message } = await getVersionTagData(cwd);

    if (await tagExists(versionTagName)) {
        await gitTagAlreadyExists(versionTagName, message, opts);
    } else {
        await setTag(versionTagName, {
            message,
            debug: opts.verbose,
            dryRun: opts.dryRun,
        });
    }

    if (opts.push) {
        await push(versionTagName, {
            debug: opts.verbose,
            dryRun: opts.dryRun,
        });
    }
}

export default async function (opts: Options = {}): Promise<void> {
    try {
        await main(opts);
    } finally {
        endPrintVerbose();
    }
}
