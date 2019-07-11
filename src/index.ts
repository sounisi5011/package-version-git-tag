import path from 'path';

import { isHeadTag, setTag, tagExists } from './git';
import { isPkgData, readJSONFile } from './utils';

async function getTagVersionName(): Promise<string> {
    const projectPkgPath = path.join(process.cwd(), 'package.json');
    const projectPkgData = await readJSONFile(projectPkgPath);

    if (isPkgData(projectPkgData)) {
        return `v${projectPkgData.version}`;
    }

    throw new Error('Failed to find version tag name.');
}

export default async function(): Promise<void> {
    const versionTagName = await getTagVersionName();
    const exists = await tagExists(versionTagName);

    if (exists) {
        if (!(await isHeadTag(versionTagName))) {
            throw new Error(`Git tag '${versionTagName}' already exists`);
        }
    }

    if (!exists) {
        await setTag(versionTagName);
    }
}
