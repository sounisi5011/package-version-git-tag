#!/usr/bin/env node

import main from './';

main().catch(error => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : error);
});
