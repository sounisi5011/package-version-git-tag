#!/usr/bin/env node

import program from 'commander';

import main from './';
import { isObject } from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PKG: unknown = require('../package.json');

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
    .option('--verbose', 'show details of executed git commands')
    .option('-n, --dry-run', 'perform a trial run with no changes made')
    .parse(process.argv);

main({
    push: program.push,
    verbose: program.verbose,
    dryRun: program.dryRun,
}).catch((error) => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : error);
});
