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

type OptionName = `${'-' | '--'}${string}`;
export interface ParseArgvResult {
    name: string;
    isHelpMode: boolean;
    options: {
        push: boolean;
        verbose: boolean;
        dryRun: boolean;
    };
    unknownOptions: OptionName[];
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

// Note: This is reinventing the wheel. Better to use `mri` package
//       see https://www.npmjs.com/package/mri
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

function kebabCase2lowerCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function parseUnknownOptions(
    cli: ReturnType<typeof cac>,
    options: Record<string, unknown>,
): OptionName[] {
    const lowerCamelCaseNameList = Object.keys(options).filter(
        (name) => !cli.globalCommand.hasOption(name),
    );
    if (lowerCamelCaseNameList.length < 1) return [];

    return [
        ...[...parseRawArgs(cli.rawArgs)]
            .map<[string, OptionName]>(({ isLong, name }) =>
                isLong
                    ? [kebabCase2lowerCamelCase(name), `--${name}`]
                    : [name, `-${name}`],
            )
            .reduce((optionNameSet, [lowerCamelCaseName, optionName]) => {
                if (lowerCamelCaseNameList.includes(lowerCamelCaseName))
                    optionNameSet.add(optionName);
                return optionNameSet;
            }, new Set<OptionName>()),
    ];
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
        unknownOptions: parseUnknownOptions(cli, options),
    };
}
