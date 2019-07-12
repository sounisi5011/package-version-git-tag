export type PromiseValue<T extends Promise<unknown>> = T extends Promise<
    infer P
>
    ? P
    : never;
