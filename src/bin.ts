#!/usr/bin/env node

import program from 'commander';
import readPkg from 'read-pkg';

import main from './';

(async () => {
    const PKG = await readPkg();

    program
        .version(PKG.version, '-v, --version')
        .description(PKG.description || '')
        .option('--push', '`git push` the added tag to the remote repository')
        .parse(process.argv);

    main({
        push: program.push,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
