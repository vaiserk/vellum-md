export {};

declare global {
  interface Window {
    electron: {
      fs: {
        openVault: () => Promise<string | null>;
        getLastVault: () => Promise<string | null>;
        writeFileSync: (filePath: string, content: string) => boolean;
        readDir: (vaultPath: string) => Promise<any[]>;
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<boolean>;
        createFile: (filePath: string, content?: string) => Promise<boolean>;
        renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
        deleteFile: (filePath: string, vaultPath?: string) => Promise<boolean>;
        restoreLastDeleted: (vaultPath: string) => Promise<boolean>;
        listTrash: () => Promise<Array<{
          nomeNaLixeira: string;
          caminhoOriginal: string;
          nome: string;
          excluidoEm: number;
          tamanho: number;
        }>>;
        restoreFromTrash: (nomeNaLixeira: string) => Promise<{ ok: boolean; erro?: string; caminho?: string }>;
        watchVault: (vaultPath: string) => Promise<boolean>;
        unwatchVault: () => Promise<boolean>;
        onVaultChanged: (callback: () => void) => () => void;
        readEmbeddingCache: (vaultPath: string) => Promise<EmbeddingCache>;
        writeEmbeddingCache: (vaultPath: string, data: EmbeddingCache) => Promise<boolean>;
      };
      export: {
        pdf: (options: any) => Promise<any>;
        slides: (options: any) => Promise<any>;
        site: (options: any) => Promise<any>;
      };
      menu: {
        onComando: (callback: (comando: string) => void) => () => void;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
    };
  }

  interface EmbeddingCacheEntry {
    mtime: number;
    embedding: number[];
    passages?: { text: string; embedding: number[] }[];
  }

  interface EmbeddingCache {
    version?: number;
    provider?: string;
    model?: string;
    /** Dimensionalidade dos vetores — caches com dimensão diferente são descartados */
    dimensions?: number;
    entries?: Record<string, EmbeddingCacheEntry>;
  }
}
