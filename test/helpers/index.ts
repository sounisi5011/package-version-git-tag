import isPromise from 'is-promise';

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

export function valueFinally<T>(
    value: T,
    onFinally: () => void,
): T extends PromiseLike<unknown> ? Promise<Awaited<T>> : T;
export function valueFinally<T>(
    value: T,
    onFinally: () => void,
): T | Promise<Awaited<T>> {
    if (!isPromise(value)) {
        onFinally();
        return value;
    }
    return Promise.resolve(value).finally(onFinally);
}

type IfNever<T, TThen, TElse = T> = [T] extends [never] ? TThen : TElse;
type IfAny<T, TThen = never, TElse = T> = unknown extends T ? TThen : TElse;
type PromiseError<T> = IfNever<
    | (T extends {
          then: {
              (
                  onfulfilled: never,
                  onrejected: (reason: infer R0) => never,
              ): unknown;
              (
                  onfulfilled: never,
                  /* eslint-disable @typescript-eslint/unified-signatures */
                  onrejected: (reason: infer R1) => never,
              ): unknown;
              (
                  onfulfilled: never,
                  onrejected: (reason: infer R2) => never,
              ): unknown;
              (
                  onfulfilled: never,
                  onrejected: (reason: infer R3) => never,
              ): unknown;
              (
                  onfulfilled: never,
                  onrejected: (reason: infer R4) => never,
                  /* eslint-enable */
              ): unknown;
          };
      }
          ? IfAny<R0> | IfAny<R1> | IfAny<R2> | IfAny<R3> | IfAny<R4>
          : never)
    | (T extends {
          catch: {
              (onrejected: (reason: infer R0) => never): unknown;
              /* eslint-disable @typescript-eslint/unified-signatures */
              (onrejected: (reason: infer R1) => never): unknown;
              (onrejected: (reason: infer R2) => never): unknown;
              (onrejected: (reason: infer R3) => never): unknown;
              (onrejected: (reason: infer R4) => never): unknown;
              /* eslint-enable */
          };
      }
          ? IfAny<R0> | IfAny<R1> | IfAny<R2> | IfAny<R3> | IfAny<R4>
          : never),
    unknown
>;

export async function retryAsync<
    TResult extends PromiseLike<unknown>,
    TError = PromiseError<TResult>,
>(
    fn: () => TResult,
    isSkip: (error: TError) => boolean,
): Promise<Awaited<TResult>> {
    let retries = 10;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (retries-- && isSkip(error as TError)) continue;
            throw error;
        }
    }
}
