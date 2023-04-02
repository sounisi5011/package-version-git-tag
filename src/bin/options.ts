/* eslint @typescript-eslint/restrict-template-expressions: ["error", {allowNumber:true, allowBoolean:true}] */

import type {
    OptionDefinition,
    OptionDefRecord,
    ValidOptionName,
} from './options.types.js';

// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
// If you want to add more options, edit under this.
// If you add a new `OptionDefRecord` object, remember to merge it into the `allOptions` variable.

export const boolOptions = {
    version: {
        description: 'Display version number',
        alias: ['V', 'v'],
    },
    help: {
        description: 'Display this message',
        alias: ['h'],
    },
    push: {
        description: '`git push` the added tag to the remote repository',
    },
    verbose: {
        description: 'show details of executed git commands',
    },
    'dry-run': {
        description: 'perform a trial run with no changes made',
        alias: ['n'],
    },
} as const satisfies OptionDefRecord;

export const allOptions = { ...boolOptions } as const;

// Do not edit down from here.
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

type DeepReadonly<T> = T extends Set<infer V> | ReadonlySet<infer V>
    ? ReadonlySet<DeepReadonly<V>>
    : {
          readonly [P in keyof T]: DeepReadonly<T[P]>;
      };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const toReadonly = <T>(v: T) => v as DeepReadonly<T>;

const fromEntries: <K extends string, V>(
    entries: Iterable<readonly [K, V]>,
) => Record<K, V> = Object.fromEntries;

function kebabCase2lowerCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function cmpOptionName(a: ValidOptionName, b: ValidOptionName): -1 | 0 | 1 {
    const aLen = a.length;
    const bLen = b.length;
    if (aLen === 1 && aLen < bLen) return -1;
    if (bLen === 1 && bLen < aLen) return 1;

    /**
     * Sort strings based on UTF-16 code point order.
     * This order does not sort surrogate pairs correctly.
     * (for example, U+1F916 (🤖) is same as "U+D83E U+DD16", and 0xD83E < 0xFB00, so it is sorted before U+FB00 (ﬀ)).
     * However, this is not a problem because only ASCII characters are expected to be included in the option names.
     * (`mri@1.2.0`'s implementation also does not consider surrogate pairs).
     */
    if (a < b) return -1;
    if (b < a) return 1;

    return 0;
}

const getAllOptionsEntries: <K extends ValidOptionName>(
    o: Record<K, OptionDefinition>,
) => [K, OptionDefinition][] = Object.entries;
const allOptionsEntries = toReadonly(getAllOptionsEntries(allOptions));

/**
 * Return writable aliasRecord objects
 * @example
 * {
 *     version: ['V', 'v'],
 *     push: [],
 *     ...
 * }
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getAliasRecord = () =>
    fromEntries(
        allOptionsEntries.map(([name, { alias }]) => [
            name,
            [
                ...new Set(
                    (alias ?? [])
                        .concat(name)
                        .flatMap((k) => [k, kebabCase2lowerCamelCase(k)]),
                ),
            ],
        ]),
    ) satisfies Record<keyof typeof allOptions, string[]>;

/**
 * @example
 * [
 *     '-V, -v, --version  Display version number',
 *     '-h, --help         Display this message',
 *     ...
 * ]
 */
export function genOptionTextList(): string[] {
    const optionDataList = allOptionsEntries.map<
        [
            name: string,
            description: OptionDefinition['description'],
            defaultValue: OptionDefinition['defaultValue'],
        ]
    >(([name, { alias = [], description, defaultValue }]) => [
        [name, ...alias]
            .sort(cmpOptionName)
            .map((name) => (name.length === 1 ? `-${name}` : `--${name}`))
            .join(', '),
        description,
        defaultValue,
    ]);
    const nameLengthMax = optionDataList
        .map(([name]) => name.length)
        .reduce((a, b) => Math.max(a, b), 0);
    /**
     * @see https://github.com/cacjs/cac/blob/v6.6.1/src/Command.ts#L192-L202
     */
    return optionDataList.map(
        ([name, description, defaultValue]) =>
            `${name.padEnd(nameLengthMax, ' ')}  ${description}${
                defaultValue !== undefined ? ` (default: ${defaultValue})` : ''
            }`,
    );
}
