import mri from 'mri';
import * as path from 'path';

import { deepCopy } from '../utils';
import { boolOptions, genOptionTextList, getAliasRecord } from './options';

export interface ParseArgvOptions {
    /**
     * The program name to display in help and version message.
     */
    readonly name: string | undefined;
    /**
     * version number.
     * Empty strings are ignored.
     */
    readonly version: string | undefined;
    /**
     * Description to be included in help.
     * Empty strings are ignored
     */
    readonly description: string | undefined;
}

export interface ParseArgvResult {
    name: string;
    isHelpMode: boolean;
    options: {
        push: boolean;
        verbose: boolean;
        dryRun: boolean;
    };
    unknownOptions: string[];
}

function mriWithAllUnknownOptions(
    args: string[],
    opts: Omit<mri.Options, 'unknown'> = {},
): [options: mri.Argv, unknownOptions: string[]] {
    const unknownOptions: string[] = [];
    const additionalAlias: Record<string, []> = {};

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        let detectUnknownOption: string | undefined;
        const result = mri(args, {
            // DO NOT REUSE `opts`. Instead, we must deep copy the `opts`.
            // `mri@1.2.0` works by rewriting the options object.
            // If the options object is reused, `mri` inserts a lot of elements into it.
            // The number of elements increases exponentially with each iteration of the loop, resulting in a significant performance degradation.
            ...deepCopy({
                ...opts,
                alias: {
                    ...additionalAlias,
                    ...opts.alias,
                },
            }),
            unknown(flag) {
                detectUnknownOption = flag;
            },
        });

        if (typeof detectUnknownOption !== 'string') {
            return [result, unknownOptions];
        }

        unknownOptions.push(detectUnknownOption);
        additionalAlias[detectUnknownOption.replace(/^-{1,2}/, '')] = [];
    }
}

function isTrueOpt(
    options: Record<string, unknown>,
    key: keyof typeof boolOptions,
): boolean {
    const value = options[key];
    /**
     * `mri@1.2.0` inserts the value of each option into an array when multiple options are passed.
     * To get the value of the last option, the last element of the array should be read.
     *
     * @example
     * const mri = require('mri');
     *
     * mri(['--foo'])
     * // => { _: [], foo: true }
     *
     * mri(['--foo', '--foo'])
     * // => { _: [], foo: [ true, true ] }
     *
     * mri(['--foo', '--no-foo'])
     * // => { _: [], foo: false }
     *
     * mri(['--foo', '--no-foo', '--foo', '--foo'])
     * // => { _: [], foo: [ false, true, true ] }
     */
    const lastValue = Array.isArray(value)
        ? (value[value.length - 1] as unknown)
        : value;
    return Boolean(lastValue);
}

/**
 * @see https://github.com/cacjs/cac/blob/v6.6.1/src/CAC.ts#L176
 */
function getCliName(argv: readonly string[], opts: ParseArgvOptions): string {
    if (opts.name) return opts.name;
    return argv[1] ? path.basename(argv[1]) : 'cli';
}

/**
 * @see https://github.com/cacjs/cac/blob/v6.6.1/src/Command.ts#L239
 * @see https://github.com/cacjs/cac/blob/v6.6.1/src/node.ts#L12
 */
function createVersionStr(cliName: string, version: string): string {
    return `${cliName}/${version} ${process.platform}-${process.arch} node-${process.version}`;
}

/**
 * @see https://github.com/cacjs/cac/blob/v6.6.1/src/Command.ts#L141-L232
 */
function createHelpText(cliName: string, opts: ParseArgvOptions): string {
    return [
        `${cliName}${opts.version ? ` v${opts.version}` : ''}`,
        ...(opts.description ? ['', opts.description] : []),
        '',
        'Usage:',
        `  $ ${cliName} [options]`,
        '',
        'Options:',
        ...genOptionTextList().map((line) => `  ${line} `),
    ].join('\n');
}

/**
 * Note: If the "--help" or "--version" option is passed to argv, this function writes to `process.stdout`.
 */
export function parseArgv(
    argv: readonly string[],
    opts: ParseArgvOptions,
): ParseArgvResult {
    const [options, unknownOptions] = mriWithAllUnknownOptions(argv.slice(2), {
        boolean: Object.keys(boolOptions),
        alias: getAliasRecord(),
    });
    const showVersion = isTrueOpt(options, 'version');
    const showHelp = isTrueOpt(options, 'help');

    const cliName = getCliName(argv, opts);
    if (showHelp) {
        console.log(createHelpText(cliName, opts));
    } else if (showVersion && opts.version) {
        console.log(createVersionStr(cliName, opts.version));
    }

    return {
        name: cliName,
        isHelpMode: showVersion || showHelp,
        options: {
            push: isTrueOpt(options, 'push'),
            verbose: isTrueOpt(options, 'verbose'),
            dryRun: isTrueOpt(options, 'dry-run'),
        },
        unknownOptions,
    };
}
