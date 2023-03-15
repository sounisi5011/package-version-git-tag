#!/usr/bin/env node

import main from './';
import { parseArgv } from './bin/argv';
import { isObject } from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PKG: unknown = require('../package.json');

let pkgName: string | undefined;
let pkgVersion: string | undefined;
let pkgDescription = '';
if (isObject(PKG)) {
    if (typeof PKG['name'] === 'string') pkgName = PKG['name'];
    if (typeof PKG['version'] === 'string') pkgVersion = PKG['version'];
    if (typeof PKG['description'] === 'string')
        pkgDescription = PKG['description'];
}

(() => {
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

    main(options).catch((error) => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
