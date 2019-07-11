#!/usr/bin/env node

import main from './';

const [, , ...args] = process.argv;

main({
    push: args.includes('--push'),
}).catch(error => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : error);
});
