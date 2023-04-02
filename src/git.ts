import { inspect } from 'node:util';

import { commandJoin } from 'command-join';

import { execFileAsync, printVerbose } from './utils.js';

export async function tagExists(tagName: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync('git', ['tag', '-l', tagName]);
        return stdout.split(/[\r\n]+/).includes(tagName);
    } catch (error) {
        throw new Error(`tagExists() Error: ${inspect(error)}`);
    }
}

export async function isHeadTag(tagName: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync('git', [
            'tag',
            '-l',
            tagName,
            '--points-at',
            'HEAD',
        ]);
        return stdout.split(/[\r\n]+/).includes(tagName);
    } catch (error) {
        throw new Error(`isHeadTag() Error: ${inspect(error)}`);
    }
}

function genTagCmdArgs(
    tagName: string,
    message?: string | undefined,
    sign: boolean = false,
): { command: string; args: string[]; commandText: string } {
    const command = 'git';
    const args =
        sign || typeof message === 'string'
            ? /**
               * @see https://github.com/npm/cli/blob/v6.13.0/lib/version.js#L304
               */
              ['tag', tagName, sign ? '-sm' : '-m', message ?? '']
            : ['tag', tagName];

    return {
        command,
        args,
        get commandText() {
            return `${command} ${commandJoin(args)}`;
        },
    };
}

export async function setTag(
    tagName: string,
    {
        message,
        sign,
        debug = false,
        dryRun = false,
    }: {
        message?: string | undefined;
        sign?: boolean | undefined;
        debug?: boolean | ((commandText: string) => string) | undefined;
        dryRun?: boolean | undefined;
    } = {},
): Promise<void> {
    const cmd = genTagCmdArgs(tagName, message, sign);

    if (typeof debug === 'function') {
        printVerbose(debug(cmd.commandText));
    } else if (debug) {
        printVerbose(`> ${cmd.commandText}`);
    }

    if (!dryRun) {
        try {
            await execFileAsync(cmd.command, cmd.args);
        } catch (error) {
            throw new Error(`setTag() Error: ${inspect(error)}`);
        }
    }
}

export async function push(
    src: string,
    {
        repository = 'origin',
        debug = false,
        dryRun = false,
    }: {
        repository?: string | undefined;
        debug?: boolean | undefined;
        dryRun?: boolean | undefined;
    } = {},
): Promise<void> {
    try {
        const args = ['push', repository, src];
        if (debug) {
            printVerbose(`> git ${commandJoin(args)}`);
        }
        if (!dryRun) {
            await execFileAsync('git', args);
        }
    } catch (error) {
        throw new Error(`push() Error: ${inspect(error)}`);
    }
}
