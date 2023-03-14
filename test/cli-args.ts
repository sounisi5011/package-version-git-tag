import { commandJoin } from 'command-join';
import { describe, expect, it, test } from 'vitest';
import {
    mockConsoleLog,
    mockProcessStderr,
    mockProcessStdout,
} from 'vitest-mock-process';

import { parseArgv, type ParseArgvOptions } from '../src/bin/argv';

function truthyOptsCases(
    optionNameList: readonly string[],
): [name: string, options: string[]][] {
    return optionNameList
        .flatMap((optionName) => [
            [optionName],
            // A number of 0 is a falsy value, but a string of "0" is a truthy value.
            // The CLI should evaluate all these values as strings and treat them as truthy values.
            // Note: Exclude "false", since "false" may need to be treated as a falsy value.
            ...[
                'foo',
                'undefined',
                'null',
                'true',
                '1',
                '0',
                '+0',
                '-0',
                'NaN',
            ].flatMap((optionValue) => [
                ...(optionValue.startsWith('-')
                    ? []
                    : [[optionName, optionValue]]),
                [`${optionName}=${optionValue}`],
            ]),
        ])
        .map((options) => [commandJoin(options), options]);
}

function falsyOptsCases(
    optionNameList: readonly string[],
): [name: string, options: string[]][] {
    return optionNameList
        .flatMap((optionName) => [
            [`--no-${optionName.replace(/^-{1,2}/, '')}`],
            [optionName, `--no-${optionName.replace(/^-{1,2}/, '')}`],
            ...['false'].flatMap((optionValue) => [
                ...(optionValue.startsWith('-')
                    ? []
                    : [[optionName, optionValue]]),
                [`${optionName}=${optionValue}`],
            ]),
        ])
        .map((options) => [commandJoin(options), options]);
}

function mockStdioRun<T>(
    fn: (mocks: {
        readonly stdout: ReturnType<typeof mockProcessStdout>;
        readonly stderr: ReturnType<typeof mockProcessStderr>;
        readonly log: ReturnType<typeof mockConsoleLog>;
    }) => T,
): T {
    const mocks = {
        stdout: mockProcessStdout(),
        stderr: mockProcessStderr(),
        log: mockConsoleLog(),
    };
    const result = fn(mocks);
    for (const mocker of Object.values(mocks)) {
        mocker.mockRestore();
    }
    return result;
}

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

const parseArgvOpts = {
    name: 'summon-dragon',
    version: '1.2.3',
    description: 'Tools used to summon dragons from other worlds',
} as const satisfies ParseArgvOptions;

test('by default, all options should be false', () =>
    mockStdioRun((mocks) => {
        expect(parseArgv(['', ''], parseArgvOpts).options).toStrictEqual({
            push: false,
            verbose: false,
            dryRun: false,
        });
        expect(mocks.stdout).toHaveBeenCalledTimes(0);
        expect(mocks.stderr).toHaveBeenCalledTimes(0);
        expect(mocks.log).toHaveBeenCalledTimes(0);
    }));

describe('--version option', () => {
    const optionNameList = ['-V', '-v', '--version'];
    it.each(truthyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'isHelpMode should be true',
            ).toMatchObject({
                isHelpMode: true,
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(1);
            expect(mocks.log).toHaveBeenCalledWith(
                `${parseArgvOpts.name}/${parseArgvOpts.version} ${process.platform}-${process.arch} node-${process.version}`,
            );
        }),
    );
    it.each(falsyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'isHelpMode should be false',
            ).toMatchObject({
                isHelpMode: false,
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(0);
        }),
    );
});

describe('--help option', () => {
    const optionNameList = ['-h', '--help'];
    it.each(truthyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'isHelpMode should be true',
            ).toMatchObject({
                isHelpMode: true,
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(1);
            expect(mocks.log).toHaveBeenCalledWith(
                [
                    `${parseArgvOpts.name} v${parseArgvOpts.version}`,
                    '',
                    parseArgvOpts.description,
                    '',
                    'Usage:',
                    `  $ ${parseArgvOpts.name} [options]`,
                    '',
                    'Options:',
                    '  -V, -v, --version  Display version number ',
                    '  -h, --help         Display this message ',
                    '  --push             `git push` the added tag to the remote repository ',
                    '  --verbose          show details of executed git commands ',
                    '  -n, --dry-run      perform a trial run with no changes made ',
                ].join('\n'),
            );
        }),
    );
    it.each(falsyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'isHelpMode should be false',
            ).toMatchObject({
                isHelpMode: false,
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(0);
        }),
    );
});

describe('--dry-run option', () => {
    const optionNameList = ['-n', '--dry-run', '--dryRun'];
    it.each(truthyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'the dry-run option should be true',
            ).toMatchObject({
                options: {
                    dryRun: true,
                },
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(0);
        }),
    );
    it.each(falsyOptsCases(optionNameList))('%s', (_, options) =>
        mockStdioRun((mocks) => {
            expect(
                parseArgv(['', '', ...options], parseArgvOpts),
                'the dry-run option should be false',
            ).toMatchObject({
                options: {
                    dryRun: false,
                },
            });
            expect(mocks.stdout).toHaveBeenCalledTimes(0);
            expect(mocks.stderr).toHaveBeenCalledTimes(0);
            expect(mocks.log).toHaveBeenCalledTimes(0);
        }),
    );
});
