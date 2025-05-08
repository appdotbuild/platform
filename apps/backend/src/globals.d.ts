namespace NodeJS {
  interface ProcessEnv {
    GITHUB_APP_ID: string;
    GITHUB_APP_PRIVATE_KEY: string;
    GITHUB_APP_BOT_EMAIL: string;
  }
}

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
