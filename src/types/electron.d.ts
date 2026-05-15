export {};

declare global {
  interface Window {
    electron: {
      fs: {
        openVault: () => Promise<string | null>;
        readDir: (vaultPath: string) => Promise<any[]>;
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<boolean>;
        createFile: (filePath: string) => Promise<boolean>;
        renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
        deleteFile: (filePath: string) => Promise<boolean>;
        restoreLastDeleted: (vaultPath: string) => Promise<boolean>;
        readEmbeddingCache: (vaultPath: string) => Promise<EmbeddingCache>;
        writeEmbeddingCache: (vaultPath: string, data: EmbeddingCache) => Promise<boolean>;
      };
      export: {
        pdf: (options: any) => Promise<any>;
        slides: (options: any) => Promise<any>;
        site: (options: any) => Promise<any>;
      };
    };
  }

  interface EmbeddingCacheEntry {
    mtime: number;
    embedding: number[];
  }

  interface EmbeddingCache {
    version?: number;
    provider?: string;
    model?: string;
    entries?: Record<string, EmbeddingCacheEntry>;
  }
}
