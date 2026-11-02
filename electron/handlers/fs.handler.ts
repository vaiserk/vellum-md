import fs from 'fs';
import path from 'path';
import { shell, app } from 'electron';

// ── Confinamento ao vault ────────────────────────────────────────────────────
// O processo principal é a ÚNICA fonte da verdade sobre qual diretório está
// aberto. O renderer não escolhe o caminho: ele só é definido aqui, quando o
// usuário seleciona a pasta no diálogo do sistema. Todo handler de arquivo
// valida o alvo contra esta raiz antes de tocar no disco.
//
// Sem isso, qualquer execução de JS no renderer (XSS numa nota, bug numa
// dependência) herdaria acesso irrestrito ao disco pela ponte window.electron.
let vaultRoot: string | null = null;

/** Caminho do arquivo onde o vault atual é lembrado entre execuções. */
function statePath(): string {
  return path.join(app.getPath('userData'), 'vellum-state.json');
}

function rememberVault(dir: string) {
  vaultRoot = path.resolve(dir);
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ lastVault: vaultRoot }), 'utf-8');
  } catch (e) {
    console.error('Nao foi possivel lembrar o vault:', e);
  }
}

/**
 * true se `target` está dentro do vault aberto.
 * `allowRoot` permite que o alvo seja o próprio diretório raiz (readDir, watch).
 */
function insideVault(target: string, allowRoot = false): boolean {
  if (!vaultRoot || typeof target !== 'string' || !target) return false;
  const resolved = path.resolve(target);
  if (resolved === vaultRoot) return allowRoot;
  const rel = path.relative(vaultRoot, resolved);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Lança se o alvo estiver fora do vault. Use em toda operação de arquivo. */
function assertInVault(target: string, allowRoot = false): string {
  if (!insideVault(target, allowRoot)) {
    console.error('[seguranca] acesso negado fora do vault:', target);
    throw new Error('Acesso negado: o caminho esta fora do vault aberto.');
  }
  return path.resolve(target);
}

// Separador usado para codificar o caminho relativo no nome do arquivo na lixeira
// (nomes de arquivo não podem conter / ou \). Permite restaurar notas de subpastas
// ao local original.
export const TRASH_SEP = '__SLASH__';

/**
 * Codifica um caminho relativo ao vault como nome de arquivo plano da lixeira,
 * trocando os separadores de diretório por TRASH_SEP.
 */
export function encodeTrashPath(relPath: string, sep: string = path.sep): string {
  return relPath.split(sep).join(TRASH_SEP);
}

/**
 * Decodifica o nome de um arquivo da lixeira (`${timestamp}_${caminho codificado}`)
 * de volta para o caminho relativo ao vault.
 */
export function decodeTrashPath(trashFileName: string, sep: string = path.sep): string {
  const originalNameMatch = trashFileName.match(/^\d+_(.+)$/);
  const encoded = originalNameMatch ? originalNameMatch[1] : trashFileName;
  return encoded.split(TRASH_SEP).join(sep);
}

export function setupFsHandlers(ipcMain: Electron.IpcMain, dialog: Electron.Dialog) {
  ipcMain.handle('fs:openVault', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) return null;
    rememberVault(filePaths[0]);
    return filePaths[0];
  });

  // Reabre o último vault usado. O caminho vem do disco do processo principal,
  // nunca do renderer — é isso que mantém o confinamento confiável mesmo com a
  // reabertura automática.
  ipcMain.handle('fs:getLastVault', async () => {
    try {
      const raw = fs.readFileSync(statePath(), 'utf-8');
      const saved = JSON.parse(raw)?.lastVault;
      if (typeof saved !== 'string' || !saved) return null;
      if (!fs.existsSync(saved) || !fs.statSync(saved).isDirectory()) return null;
      vaultRoot = path.resolve(saved);
      return vaultRoot;
    } catch {
      return null;
    }
  });

  ipcMain.handle('fs:readDir', async (_, vaultPath: string) => {
    try {
      // Se o renderer pedir a raiz que já está aberta, segue; caso contrário
      // (primeira abertura) confia no diálogo que acabou de definir vaultRoot.
      assertInVault(vaultPath, true);
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
    return fs.readFileSync(assertInVault(filePath), 'utf-8');
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    fs.writeFileSync(assertInVault(filePath), content, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:createFile', async (_, rawPath: string) => {
    const filePath = assertInVault(rawPath);
    if (fs.existsSync(filePath)) return false;
    const frontmatter = `---\ntitle: "Nova Nota"\ncreated: ${new Date().toISOString()}\nmodified: ${new Date().toISOString()}\ntags: []\naliases: []\n---\n\n`;
    fs.writeFileSync(filePath, frontmatter, 'utf-8');
    return true;
  });

  ipcMain.handle('fs:renameFile', async (_, oldPath: string, newPath: string) => {
    try {
      // Origem e destino precisam estar dentro do vault — senão rename viraria
      // uma primitiva para mover arquivos para fora dele.
      fs.renameSync(assertInVault(oldPath), assertInVault(newPath));
      return true;
    } catch (e) {
      console.error('Rename error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:deleteFile', async (_, rawPath: string, _vaultPath?: string) => {
    try {
      const filePath = assertInVault(rawPath);
      // Move para a lixeira NA RAIZ DO VAULT (não na pasta do arquivo) — assim
      // notas de subpastas também aparecem em restoreLastDeleted e não ficam
      // diretórios .vellum espalhados pelo vault.
      // A raiz vem de vaultRoot (processo principal), não do argumento do
      // renderer, que agora é ignorado.
      const baseDir = vaultRoot as string;
      const trashDir = path.join(baseDir, '.vellum', 'trash');
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
      }
      // Codifica o caminho relativo ao vault no nome, para restauração no local original
      const relPath = path.relative(baseDir, filePath);
      const encoded = encodeTrashPath(relPath);
      fs.renameSync(filePath, path.join(trashDir, `${Date.now()}_${encoded}`));
      return true;
    } catch (e) {
      console.error('Delete error:', e);
      return false;
    }
  });

  ipcMain.handle('fs:restoreLastDeleted', async (_, _vaultPath: string) => {
    try {
      if (!vaultRoot) return false;
      const vaultPath = vaultRoot;
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
      const relPath = decodeTrashPath(latestFile);

      // Restaura no local original, recriando subpastas se necessário.
      // O nome do arquivo na lixeira é decodificado em caminho relativo, então
      // precisa ser validado: um nome contendo ".." escaparia do vault.
      const targetPath = assertInVault(path.join(vaultPath, relPath));
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

  ipcMain.handle('fs:readEmbeddingCache', async (_, _vaultPath: string) => {
    try {
      if (!vaultRoot) return {};
      const cachePath = path.join(vaultRoot, '.vellum', 'embeddings.json');
      if (!fs.existsSync(cachePath)) return {};
      const raw = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Read embedding cache error:', e);
      return {};
    }
  });

  ipcMain.handle('fs:writeEmbeddingCache', async (_, _vaultPath: string, data: any) => {
    try {
      if (!vaultRoot) return false;
      const vellumDir = path.join(vaultRoot, '.vellum');
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

  ipcMain.handle('fs:watchVault', (event, _vaultPath: string) => {
    vaultWatcher?.close();
    vaultWatcher = null;
    try {
      if (!vaultRoot) return false;
      const vaultPath = vaultRoot;
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
