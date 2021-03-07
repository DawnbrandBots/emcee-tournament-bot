/**
 * Useful repeated meta-types.
 */
export type Public<T> = Pick<T, keyof T>;
export type Tail<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never;
