#!/usr/bin/env node

import program from 'commander';

import main from './';

program
    .option('--push', '`git push` the added tag to the remote repository')
    .parse(process.argv);

main({
    push: program.push,
}).catch(error => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : error);
});
