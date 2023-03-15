type CharUnion<T extends string> = T extends `${infer Char}${infer Str}`
    ? Char | CharUnion<Str>
    : never;
type AsciiLetterChar = CharUnion<'abcdefghijklmnopqrstuvwxyz'>;
type AsciiDigitChar = CharUnion<'0123456789'>;

/**
 * @note We wanted this type to be "a string allowing only kebab cases", but that was probably not possible.
 */
export type ValidOptionName =
    // String of one or more lengths allowing all characters except uppercase
    | `${AsciiLetterChar | AsciiDigitChar}${Lowercase<string>}`
    // Allow uppercase if only one letter
    | Uppercase<AsciiLetterChar>;

export interface OptionDefinition {
    readonly description: string;
    readonly alias?: readonly ValidOptionName[];
    readonly defaultValue?: string | number | boolean;
}

export type OptionDefRecord = Partial<
    Record<ValidOptionName, OptionDefinition>
>;
