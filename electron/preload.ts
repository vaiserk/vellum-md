import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  fs: {
    openVault: () => ipcRenderer.invoke('fs:openVault'),
    readDir: (vaultPath: string) => ipcRenderer.invoke('fs:readDir', vaultPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
    restoreLastDeleted: (vaultPath: string) => ipcRenderer.invoke('fs:restoreLastDeleted', vaultPath),
  },
  export: {
    pdf: (options: any) => ipcRenderer.invoke('export:pdf', options),
  }
});
