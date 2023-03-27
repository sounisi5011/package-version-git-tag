export type PromiseValue<T extends Promise<unknown>> = T extends Promise<
    infer P
>
    ? P
    : never;

export type WithUndefinedProp<T, K extends keyof T> = {
    [P in K]: T[P] | undefined;
} & Omit<T, K>;
