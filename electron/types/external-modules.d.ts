declare module 'decompress' {
  export type File = {
    path: string;
    mode: number;
    type: 'file' | 'directory';
    data: Buffer;
  };

  export type Plugin = (input: Buffer) => Promise<File[]> | File[];

  interface DecompressOptions {
    plugins?: Plugin[];
    filter?: (file: File) => boolean;
    map?: (file: File) => File | Promise<File>;
  }

  export default function decompress(input: string, output?: string, options?: DecompressOptions): Promise<File[]>;
}

declare module 'decompress-targz' {
  import type { Plugin } from 'decompress';
  export default function decompressTargz(): Plugin;
}

declare module 'decompress-unzip' {
  import type { Plugin } from 'decompress';
  export default function decompressUnzip(): Plugin;
}

declare module 'which' {
  interface WhichOptions {
    path?: string;
    pathExt?: string;
    all?: boolean;
    nothrow?: boolean;
  }

  export default function which(cmd: string, options?: WhichOptions): Promise<string>;
  export function sync(cmd: string, options?: WhichOptions): string;
}

declare module 'semver' {
  export type Options = {
    loose?: boolean;
    includePrerelease?: boolean;
  };

  export function valid(version: string | null | undefined, optionsOrLoose?: boolean | Options): string | null;
  export function lt(version: string | number, compare: string | number, optionsOrLoose?: boolean | Options): boolean;

  const semver: {
    valid: typeof valid;
    lt: typeof lt;
  };

  export default semver;
}
