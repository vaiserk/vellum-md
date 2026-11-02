import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { setupFsHandlers } from './handlers/fs.handler';
import { setupExportHandlers } from './handlers/export.handler';
import { montarMenu } from './menu';

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
  const paginaDoApp = pathToFileURL(path.join(__dirname, '../dist/index.html')).href;

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Só a própria página do app. A versão anterior liberava QUALQUER file://,
    // e um link relativo numa nota (ex.: "www.google.com") navegava para
    // file:///.../www.google.com: a pagina falhava e o app virava tela branca
    // sem caminho de volta.
    const semHash = url.split('#')[0];
    const permitido = appOrigin ? url.startsWith(appOrigin) : semHash === paginaDoApp;
    if (!permitido) {
      event.preventDefault();
      console.warn('[seguranca] navegacao bloqueada:', url);
    }
  });

  // Rede de segurança: se ainda assim a janela acabar numa pagina que nao
  // carrega, volta para o app em vez de deixar a tela branca.
  mainWindow.webContents.on('did-fail-load', (_e, codigo, descricao, urlQueFalhou, ehPrincipal) => {
    if (!ehPrincipal || codigo === -3 /* abortado pelo proprio app */) return;
    console.error('[recuperacao] falha ao carregar:', urlQueFalhou, codigo, descricao);
    if (appOrigin) mainWindow?.loadURL(appOrigin);
    else mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
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
  montarMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
