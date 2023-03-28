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
