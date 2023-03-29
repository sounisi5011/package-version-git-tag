import type execa from 'execa';
import type * as vitest from 'vitest';

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * @see https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-resolve-functions
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return (
        // Objects in ECMAScript also include functions
        ((typeof value === 'object' && value !== null) ||
            typeof value === 'function') &&
        // The "then" property is also checked if it is present in the prototype chain
        'then' in value &&
        typeof value.then === 'function'
    );
}

export function valueFinally<T>(
    value: T,
    onFinally: () => void,
): T extends PromiseLike<unknown> ? Promise<Awaited<T>> : T;
export function valueFinally<T>(
    value: T,
    onFinally: () => void,
): T | Promise<Awaited<T>> {
    if (!isThenable(value)) {
        onFinally();
        return value;
    }
    return Promise.resolve(value).finally(onFinally);
}

export async function retryExec(
    fn: () => execa.ExecaChildProcess,
    isSkip: (error: execa.ExecaError) => boolean,
): Promise<Awaited<execa.ExecaChildProcess>> {
    const ignoredError = Symbol('ignoredExecError');
    let retries = 10;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        // Note: The `try...catch` statement is not used here,
        //       because the type of the `error` variable will only be `execa.ExecaError` if the `.catch()` method is used.
        const result = await fn().catch<typeof ignoredError>((error) => {
            if (retries-- && isSkip(error)) return ignoredError;
            throw error;
        });
        if (result !== ignoredError) return result;
    }
}

export function getTestNameList(
    meta: Readonly<vitest.Test | vitest.Suite> | undefined,
): string[] {
    if (!meta) return [];
    return getTestNameList(meta.suite).concat(meta.name);
}
