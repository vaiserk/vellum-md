import fs from 'fs';
import path from 'path';

export function setupFsHandlers(ipcMain: Electron.IpcMain, dialog: Electron.Dialog) {
  ipcMain.handle('fs:openVault', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) return null;
    return filePaths[0];
  });

  ipcMain.handle('fs:readDir', async (_, vaultPath: string) => {
    try {
      const walk = (dir: string) => {
        let results: any[] = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          if (file.startsWith('.') && file !== '.vellum') return;
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results.push({
              name: file,
              path: filePath,
              type: 'folder',
              children: walk(filePath),
              mtime: stat.mtimeMs,
            });
          } else if (file.endsWith('.md')) {
            results.push({
              name: file,
              path: filePath,
              type: 'file',
              mtime: stat.mtimeMs,
              size: stat.size,
            });
          }
        });
        return results;
      };
      return walk(vaultPath);
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    return fs.readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:createFile', async (_, filePath: string) => {
    const frontmatter = `---\ntitle: "Nova Nota"\ncreated: ${new Date().toISOString()}\nmodified: ${new Date().toISOString()}\ntags: []\naliases: []\n---\n\n`;
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, frontmatter, 'utf-8');
    }
    return true;
  });

  ipcMain.handle('fs:renameFile', async (_, oldPath: string, newPath: string) => {
    try {
      fs.renameSync(oldPath, newPath);
      return true;
    } catch (e) {
      console.error('Rename error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
    try {
      // Move to a .vellum/trash folder instead of permanent delete
      const dir = path.dirname(filePath);
      const trashDir = path.join(dir, '.vellum', 'trash');
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
      }
      const fileName = path.basename(filePath);
      fs.renameSync(filePath, path.join(trashDir, `${Date.now()}_${fileName}`));
      return true;
    } catch (e) {
      console.error('Delete error:', e);
      return false;
    }
  });
}
