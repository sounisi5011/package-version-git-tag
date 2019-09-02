#!/usr/bin/env node

import program from 'commander';
import path from 'path';

import main from './';
import { isObject, readJSONFile } from './utils';

(async () => {
    const PKG = await readJSONFile(path.join(__dirname, '..', 'package.json'));

    if (isObject(PKG)) {
        if (typeof PKG.version === 'string') {
            program.version(PKG.version, '-v, --version');
        }

        if (typeof PKG.description === 'string') {
            program.description(PKG.description);
        }
    }

    program
        .option('--push', '`git push` the added tag to the remote repository')
        .parse(process.argv);

    main({
        push: program.push,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
