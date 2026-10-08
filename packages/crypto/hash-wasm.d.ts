declare module 'hash-wasm' {
  export interface Argon2idOptions {
    password: string | Uint8Array;
    salt: Uint8Array;
    parallelism?: number;
    iterations?: number;
    memorySize?: number;
    hashLength?: number;
    outputType?: 'hex' | 'binary';
  }

  export function argon2id(options: Argon2idOptions): Promise<string>;
}
