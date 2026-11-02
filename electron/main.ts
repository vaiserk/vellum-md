import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { setupFsHandlers } from './handlers/fs.handler';
import { setupExportHandlers } from './handlers/export.handler';

const isDev = !!process.env.VITE_DEV_SERVER_URL;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Disable webSecurity only in dev (needed for localhost ↔ file:// cross-origin).
      // In production the app loads from file:// directly — webSecurity must stay ON.
      webSecurity: !isDev,
    },
  });

  // ── Trava de navegação ─────────────────────────────────────────────────────
  // O preload expõe window.electron.fs nesta janela. Se ela conseguisse navegar
  // para uma página remota, essa página herdaria a ponte e, com ela, acesso ao
  // disco. Por isso a janela nunca sai do bundle local e nenhum popup é aberto:
  // links externos vão para o navegador do sistema.
  const appOrigin = process.env.VITE_DEV_SERVER_URL;

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const permitido = appOrigin ? url.startsWith(appOrigin) : url.startsWith('file://');
    if (!permitido) {
      event.preventDefault();
      console.warn('[seguranca] navegacao bloqueada:', url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Nenhuma janela nova do Electron. http/https abre fora, no navegador.
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') shell.openExternal(url);
      else console.warn('[seguranca] protocolo bloqueado:', url);
    } catch {
      console.warn('[seguranca] URL invalida bloqueada:', url);
    }
    return { action: 'deny' };
  });

  // Nenhum anexo de webview é usado pelo app; bloquear fecha mais um caminho.
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    console.warn('[seguranca] webview bloqueada');
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  setupFsHandlers(ipcMain, dialog);
  setupExportHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
