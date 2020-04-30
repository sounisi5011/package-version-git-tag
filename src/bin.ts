#!/usr/bin/env node

import { cac } from 'cac';

import main from './';
import { isObject } from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PKG: unknown = require('../package.json');

let pkgName: string | undefined;
let pkgVersion: string | undefined;
let pkgDescription = '';
if (isObject(PKG)) {
    if (typeof PKG.name === 'string') pkgName = PKG.name;
    if (typeof PKG.version === 'string') pkgVersion = PKG.version;
    if (typeof PKG.description === 'string') pkgDescription = PKG.description;
}

const cli = cac(pkgName);
if (pkgVersion) {
    cli.version(pkgVersion, '-V, -v, --version');
}
cli.help(
    pkgDescription
        ? (sections) => {
              sections.splice(1, 0, { body: pkgDescription });
          }
        : undefined,
);

cli.option('--push', '`git push` the added tag to the remote repository');
cli.option('--verbose', 'show details of executed git commands');
cli.option('-n, --dry-run', 'perform a trial run with no changes made');

if (cli.commands.length <= 0) {
    cli.usage('[options]');
}

const { options } = cli.parse();
if (options.version || options.help) {
    process.exit();
}

const unknownOptions = Object.keys(options).filter(
    (name) => name !== '--' && !cli.globalCommand.hasOption(name),
);
if (unknownOptions.length > 0) {
    process.exitCode = 1;
    console.error(
        `unknown ${unknownOptions.length > 1 ? 'options' : 'option'}: ` +
            `${unknownOptions
                .map((name) => (/^[^-]$/.test(name) ? `-${name}` : `--${name}`))
                .join(' ')}\n` +
            `Try \`${cli.name} --help\` for valid options.`,
    );
    process.exit();
}

main({
    push: options.push,
    verbose: options.verbose,
    dryRun: options.dryRun,
}).catch((error) => {
    process.exitCode = 1;
    console.error(error instanceof Error ? error.message : error);
});
