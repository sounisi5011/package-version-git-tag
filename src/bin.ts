#!/usr/bin/env node

import { parseArgv } from './bin/argv.js';
import main from './index.js';
import { isObject, readJSONFile } from './utils.js';

const PKG = await readJSONFile(new URL('../package.json', import.meta.url));
let pkgName: string | undefined;
let pkgVersion: string | undefined;
let pkgDescription = '';
if (isObject(PKG)) {
    if (typeof PKG['name'] === 'string') pkgName = PKG['name'];
    if (typeof PKG['version'] === 'string') pkgVersion = PKG['version'];
    if (typeof PKG['description'] === 'string')
        pkgDescription = PKG['description'];
}

await (async () => {
    const {
        isHelpMode,
        name: cliName,
        options,
        unknownOptions,
    } = parseArgv(process.argv, {
        name: pkgName,
        version: pkgVersion,
        description: pkgDescription,
    });

    if (isHelpMode) {
        return;
    }

    if (unknownOptions.length > 0) {
        process.exitCode = 1;
        console.error(
            `unknown ${unknownOptions.length > 1 ? 'options' : 'option'}: ` +
                `${unknownOptions.join(' ')}\n` +
                `Try \`${cliName} --help\` for valid options.`,
        );
        return;
    }

    await main(options).catch((error) => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
