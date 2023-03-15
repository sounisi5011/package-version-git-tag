import * as path from 'node:path';

import mri = require('mri');
import {
    boolOptions,
    genOptionTextList,
    getAliasRecord,
    knownOptionNameSet,
} from './options';

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

type RawOptionName = `${'-' | '--'}${string}`;
export interface ParseArgvResult {
    name: string;
    isHelpMode: boolean;
    options: {
        push: boolean;
        verbose: boolean;
        dryRun: boolean;
    };
    unknownOptions: RawOptionName[];
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

// Note: This is reinventing the wheel.
//       But we had to write this because `mri@1.2.0` does not expose the internal parser.
function* parseRawArgs(
    rawArgs: readonly string[],
): IterableIterator<{ isLong: boolean; name: string }> {
    for (const arg of rawArgs.slice(2)) {
        if (arg === '--') break;

        const hyphenMinusMatch = /^-+/.exec(arg);
        if (!hyphenMinusMatch) continue;

        const hyphenMinusLength = hyphenMinusMatch[0].length;
        const optionName = arg.substring(hyphenMinusLength).replace(/=.*$/, '');

        if (hyphenMinusLength === 2) {
            yield { isLong: true, name: optionName };
        } else {
            yield* [...optionName].map((name) => ({
                isLong: false,
                name,
            }));
        }
    }
}

function parseUnknownOptions(
    argv: readonly string[],
    options: Record<string, unknown>,
): RawOptionName[] {
    const unknownNameSet = new Set(
        Object.keys(options).filter((name) => !knownOptionNameSet.has(name)),
    );
    if (unknownNameSet.size < 1) return [];

    return [
        ...[...parseRawArgs(argv)]
            .map<[string, RawOptionName]>(({ isLong, name }) =>
                isLong ? [name, `--${name}`] : [name, `-${name}`],
            )
            .reduce((optionNameSet, [optionName, rawOptionName]) => {
                if (unknownNameSet.has(optionName))
                    optionNameSet.add(rawOptionName);
                return optionNameSet;
            }, new Set<RawOptionName>()),
    ];
}

/**
 * Note: If the "--help" or "--version" option is passed to argv, this function writes to `process.stdout`.
 */
export function parseArgv(
    argv: readonly string[],
    opts: ParseArgvOptions,
): ParseArgvResult {
    const options = mri(argv.slice(2), {
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
        unknownOptions: parseUnknownOptions(argv, options),
    };
}
