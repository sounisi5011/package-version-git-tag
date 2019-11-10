import path from 'path';

import { isHeadTag, push, setTag, tagExists } from './git';
import {
    endPrintVerbose,
    getConfig,
    isPkgData,
    printVerbose,
    readJSONFile,
} from './utils';

export interface Options {
    push?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
}

async function getTagVersionName(): Promise<string> {
    const projectPkgPath = path.join(process.cwd(), 'package.json');
    const projectPkgData = await readJSONFile(projectPkgPath);

    if (isPkgData(projectPkgData)) {
        /**
         * @see https://github.com/sindresorhus/np/blob/v5.1.3/source/util.js#L51-L65
         * @see https://github.com/npm/cli/blob/v6.13.0/lib/version.js#L311
         * @see https://github.com/yarnpkg/yarn/blob/v1.19.1/src/cli/commands/version.js#L206
         */
        const prefix = await getConfig({
            npm: 'tag-version-prefix',
            yarn: 'version-tag-prefix',
        });
        return `${prefix}${projectPkgData.version}`;
    }

    throw new Error('Failed to find version tag name.');
}

async function gitTagAlreadyExists(
    versionTagName: string,
    opts: Options,
): Promise<void> {
    if (!(await isHeadTag(versionTagName))) {
        throw new Error(`Git tag '${versionTagName}' already exists`);
    }

    if (opts.verbose) {
        printVerbose(
            `> #git tag ${versionTagName}\n  # tag '${versionTagName}' already exists`,
        );
    }
}

async function main(opts: Options): Promise<void> {
    if (opts.dryRun) {
        console.error('Dry Run enabled');
        opts.verbose = true;
    }

    const versionTagName = await getTagVersionName();

    if (await tagExists(versionTagName)) {
        await gitTagAlreadyExists(versionTagName, opts);
    } else {
        await setTag(versionTagName, {
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

export default async function(opts: Options = {}): Promise<void> {
    try {
        await main(opts);
    } finally {
        endPrintVerbose();
    }
}
