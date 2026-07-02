import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  fs: {
    openVault: () => ipcRenderer.invoke('fs:openVault'),
    readDir: (vaultPath: string) => ipcRenderer.invoke('fs:readDir', vaultPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
    deleteFile: (filePath: string, vaultPath?: string) => ipcRenderer.invoke('fs:deleteFile', filePath, vaultPath),
    restoreLastDeleted: (vaultPath: string) => ipcRenderer.invoke('fs:restoreLastDeleted', vaultPath),
    watchVault: (vaultPath: string) => ipcRenderer.invoke('fs:watchVault', vaultPath),
    unwatchVault: () => ipcRenderer.invoke('fs:unwatchVault'),
    onVaultChanged: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('vault:changed', listener);
      // Retorna a função de unsubscribe
      return () => ipcRenderer.removeListener('vault:changed', listener);
    },
    readEmbeddingCache: (vaultPath: string) => ipcRenderer.invoke('fs:readEmbeddingCache', vaultPath),
    writeEmbeddingCache: (vaultPath: string, data: any) => ipcRenderer.invoke('fs:writeEmbeddingCache', vaultPath, data),
  },
  export: {
    pdf: (options: any) => ipcRenderer.invoke('export:pdf', options),
    slides: (options: any) => ipcRenderer.invoke('export:slides', options),
    site: (options: any) => ipcRenderer.invoke('export:site', options),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
});
