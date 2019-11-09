import path from 'path';

import { isHeadTag, push, setTag, tagExists } from './git';
import {
    endPrintVerbose,
    isPkgData,
    printVerbose,
    readJSONFile,
} from './utils';

export interface Options {
    push?: boolean;
    verbose?: boolean;
}

async function getTagVersionName(): Promise<string> {
    const projectPkgPath = path.join(process.cwd(), 'package.json');
    const projectPkgData = await readJSONFile(projectPkgPath);

    if (isPkgData(projectPkgData)) {
        return `v${projectPkgData.version}`;
    }

    throw new Error('Failed to find version tag name.');
}

async function main(opts: Options): Promise<void> {
    const versionTagName = await getTagVersionName();

    if (await tagExists(versionTagName)) {
        if (!(await isHeadTag(versionTagName))) {
            throw new Error(`Git tag '${versionTagName}' already exists`);
        }

        if (opts.verbose) {
            printVerbose(
                `> # git tag ${versionTagName}\n> # tag '${versionTagName}' already exists`,
            );
        }
    } else {
        await setTag(versionTagName, { debug: opts.verbose });
    }

    if (opts.push) {
        await push(versionTagName, { debug: opts.verbose });
    }
}

export default async function(opts: Options = {}): Promise<void> {
    try {
        await main(opts);
    } finally {
        endPrintVerbose();
    }
}
