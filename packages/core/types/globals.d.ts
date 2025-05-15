export {};

declare global {
  // make JSON.stringify and JSON.parse type safe
  type Stringified<T> = string & { source: T };
  interface JSON {
    stringify<T>(
      value: T,
      replacer?: null | undefined,
      space?: string | number,
    ): Stringified<T>;
    parse<T>(value: Stringified<T>, replacer?: null | undefined): T;
  }
}
