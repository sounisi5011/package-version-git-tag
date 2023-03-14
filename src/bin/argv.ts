import { cac } from 'cac';

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

function isTruthyOpt(option: unknown): boolean {
    return option !== undefined && option !== false && option !== 'false';
}

function genHelpCallback(
    description: string | undefined,
): Parameters<ReturnType<typeof cac>['help']>[0] {
    return description
        ? (sections) => {
              sections.splice(1, 0, { body: description });
          }
        : undefined;
}

function getUnknownOptions(
    cli: ReturnType<typeof cac>,
    options: Record<string, unknown>,
): string[] {
    return Object.keys(options)
        .filter((name) => name !== '--' && !cli.globalCommand.hasOption(name))
        .map((name) => (/^[^-]$/.test(name) ? `-${name}` : `--${name}`));
}

/**
 * Note: If the "--help" or "--version" option is passed to argv, this function writes to `process.stdout`.
 */
export function parseArgv(
    argv: readonly string[],
    opts: ParseArgvOptions,
): ParseArgvResult {
    const cli = cac(opts.name);
    if (opts.version) cli.version(opts.version, '-V, -v, --version');
    cli.help(genHelpCallback(opts.description));

    cli.option('--push', '`git push` the added tag to the remote repository');
    cli.option('--verbose', 'show details of executed git commands');
    cli.option('-n, --dry-run', 'perform a trial run with no changes made');

    if (cli.commands.length <= 0) cli.usage('[options]');

    const { options } = cli.parse([...argv]);

    return {
        name: cli.name,
        isHelpMode:
            isTruthyOpt(options['version']) || isTruthyOpt(options['help']),
        options: {
            push: isTruthyOpt(options['push']),
            verbose: isTruthyOpt(options['verbose']),
            dryRun: isTruthyOpt(options['dryRun']),
        },
        unknownOptions: getUnknownOptions(cli, options),
    };
}
