// Minimal shim to silence TypeScript in non-Deno environments
declare const Deno: {
  env?: { get?: (name: string) => string | undefined };
  readTextFile?: (path: string) => Promise<string>;
};

export {};
