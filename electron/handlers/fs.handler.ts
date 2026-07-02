import fs from 'fs';
import path from 'path';
import { shell } from 'electron';

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
          if (file.startsWith('.')) return;
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
          } else if (file.match(/\.(md|txt|png|jpe?g|gif|svg|webp)$/i)) {
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
    if (fs.existsSync(filePath)) return false;
    const frontmatter = `---\ntitle: "Nova Nota"\ncreated: ${new Date().toISOString()}\nmodified: ${new Date().toISOString()}\ntags: []\naliases: []\n---\n\n`;
    fs.writeFileSync(filePath, frontmatter, 'utf-8');
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

  // Separador usado para codificar o caminho relativo no nome do arquivo na lixeira
  // (nomes de arquivo não podem conter / ou \). Permite restaurar notas de subpastas
  // ao local original.
  const TRASH_SEP = '__SLASH__';

  ipcMain.handle('fs:deleteFile', async (_, filePath: string, vaultPath?: string) => {
    try {
      // Move para a lixeira NA RAIZ DO VAULT (não na pasta do arquivo) — assim
      // notas de subpastas também aparecem em restoreLastDeleted e não ficam
      // diretórios .vellum espalhados pelo vault.
      const baseDir = vaultPath || path.dirname(filePath);
      const trashDir = path.join(baseDir, '.vellum', 'trash');
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
      }
      // Codifica o caminho relativo ao vault no nome, para restauração no local original
      const relPath = vaultPath ? path.relative(vaultPath, filePath) : path.basename(filePath);
      const encoded = relPath.split(path.sep).join(TRASH_SEP);
      fs.renameSync(filePath, path.join(trashDir, `${Date.now()}_${encoded}`));
      return true;
    } catch (e) {
      console.error('Delete error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:restoreLastDeleted', async (_, vaultPath: string) => {
    try {
      const trashDir = path.join(vaultPath, '.vellum', 'trash');
      if (!fs.existsSync(trashDir)) return false;
      const files = fs.readdirSync(trashDir);
      if (files.length === 0) return false;

      let latestFile = files[0];
      let latestTime = fs.statSync(path.join(trashDir, latestFile)).mtimeMs;
      for (const f of files) {
        const t = fs.statSync(path.join(trashDir, f)).mtimeMs;
        if (t > latestTime) {
          latestTime = t;
          latestFile = f;
        }
      }

      // Nome na lixeira: `${timestamp}_${relPath com separadores codificados}`
      const originalNameMatch = latestFile.match(/^\d+_(.+)$/);
      const encoded = originalNameMatch ? originalNameMatch[1] : latestFile;
      const relPath = encoded.split(TRASH_SEP).join(path.sep);

      // Restaura no local original, recriando subpastas se necessário
      const targetPath = path.join(vaultPath, relPath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.renameSync(path.join(trashDir, latestFile), targetPath);
      return true;
    } catch (e) {
      console.error('Restore error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:readEmbeddingCache', async (_, vaultPath: string) => {
    try {
      const cachePath = path.join(vaultPath, '.vellum', 'embeddings.json');
      if (!fs.existsSync(cachePath)) return {};
      const raw = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Read embedding cache error:', e);
      return {};
    }
  });

  ipcMain.handle('fs:writeEmbeddingCache', async (_, vaultPath: string, data: any) => {
    try {
      const vellumDir = path.join(vaultPath, '.vellum');
      if (!fs.existsSync(vellumDir)) {
        fs.mkdirSync(vellumDir, { recursive: true });
      }
      const cachePath = path.join(vellumDir, 'embeddings.json');
      fs.writeFileSync(cachePath, JSON.stringify(data), 'utf-8');
      return true;
    } catch (e) {
      console.error('Write embedding cache error:', e);
      return false;
    }
  });

  // ── Monitoramento em tempo real do vault ──────────────────────────────────
  // Cumpre o requisito de "monitoramento em tempo real de alterações": mudanças
  // feitas por fora do app (outro editor, sync de nuvem) atualizam a árvore.
  let vaultWatcher: fs.FSWatcher | null = null;
  let watchDebounce: NodeJS.Timeout | null = null;

  ipcMain.handle('fs:watchVault', (event, vaultPath: string) => {
    vaultWatcher?.close();
    vaultWatcher = null;
    try {
      const sender = event.sender;
      // recursive: suportado no Windows/macOS e no Linux a partir do Node 20
      vaultWatcher = fs.watch(vaultPath, { recursive: true }, (_eventType, filename) => {
        const name = filename ? String(filename) : '';
        // Ignora .vellum (cache de embeddings, lixeira) — sem este filtro,
        // gravar o cache dispararia o watcher e criaria loop de reindexação
        if (name.includes('.vellum')) return;
        // Ignora extensões que o app não lista (mantém pastas, que não têm extensão)
        const ext = path.extname(name);
        if (ext && !/\.(md|txt|png|jpe?g|gif|svg|webp)$/i.test(ext)) return;
        // Debounce: rajadas de eventos (salvar, sync) viram uma notificação só
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          if (!sender.isDestroyed()) sender.send('vault:changed');
        }, 1500);
      });
      return true;
    } catch (e) {
      console.error('watchVault error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:unwatchVault', () => {
    vaultWatcher?.close();
    vaultWatcher = null;
    if (watchDebounce) { clearTimeout(watchDebounce); watchDebounce = null; }
    return true;
  });

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    // Whitelist only safe protocols — block file://, javascript:, ms-settings:, etc.
    let parsed: URL;
    try { parsed = new URL(url); } catch { return; }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    await shell.openExternal(url);
  });
}
