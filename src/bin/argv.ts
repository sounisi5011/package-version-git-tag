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
    return option !== undefined && option !== false;
}

/**
 * Note: If the "--help" or "--version" option is passed to argv, this function writes to `process.stdout`.
 */
export function parseArgv(
    argv: readonly string[],
    opts: ParseArgvOptions,
): ParseArgvResult {
    const cli = cac(opts.name);
    if (opts.version) {
        cli.version(opts.version, '-V, -v, --version');
    }
    if (opts.description) {
        // TypeScript warns: The "description" property may be undefined value inside a function.
        // So, we assign it to the variable "body" here.
        const body = opts.description;
        cli.help((sections) => {
            sections.splice(1, 0, { body });
        });
    } else {
        cli.help();
    }

    cli.option('--push', '`git push` the added tag to the remote repository');
    cli.option('--verbose', 'show details of executed git commands');
    cli.option('-n, --dry-run', 'perform a trial run with no changes made');

    if (cli.commands.length <= 0) {
        cli.usage('[options]');
    }

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
        unknownOptions: Object.keys(options)
            .filter(
                (name) => name !== '--' && !cli.globalCommand.hasOption(name),
            )
            .map((name) => (/^[^-]$/.test(name) ? `-${name}` : `--${name}`)),
    };
}
