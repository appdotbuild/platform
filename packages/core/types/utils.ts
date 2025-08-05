export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
