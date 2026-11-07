import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import path from 'path';

// Menu da aplicação.
//
// Antes o app usava o menu padrão do Electron, em inglês e com um item de
// ajuda que levava ao site do Electron — nada a ver com o VellumMD. Aqui o
// menu é em português e o item de Ajuda abre o manual que é distribuído junto
// do aplicativo (dist/ajuda.html), funcionando sem internet.

let janelaAjuda: BrowserWindow | null = null;

/** Caminho do manual dentro do pacote. */
function caminhoDaAjuda(): string {
  return path.join(__dirname, '../dist/ajuda.html');
}

/**
 * Abre o manual numa janela própria. Se já estiver aberto, traz para a frente
 * em vez de abrir outra cópia.
 *
 * A janela NÃO recebe o preload: a ajuda é conteúdo estático e não tem motivo
 * nenhum para enxergar a ponte de acesso a disco.
 */
export function abrirAjuda(ancora?: string) {
  if (janelaAjuda && !janelaAjuda.isDestroyed()) {
    janelaAjuda.focus();
    if (ancora) janelaAjuda.webContents.executeJavaScript(
      `location.hash = ${JSON.stringify('#' + ancora)}`
    ).catch(() => { /* janela fechando */ });
    return;
  }

  janelaAjuda = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 640,
    title: 'Ajuda do VellumMD',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sem preload de propósito
    },
  });

  // A janela de ajuda também não pode sair do arquivo local.
  janelaAjuda.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  janelaAjuda.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  janelaAjuda.on('closed', () => { janelaAjuda = null; });
  janelaAjuda.loadFile(caminhoDaAjuda(), ancora ? { hash: ancora } : undefined);
}

/** Pede ao renderer que execute um comando, para itens de menu equivalentes
 *  aos atalhos de teclado. Um canal so, com o nome do comando no payload. */
function comando(nome: string) {
  const janela = BrowserWindow.getAllWindows().find(j => j !== janelaAjuda);
  janela?.webContents.send('menu:comando', nome);
}

export function montarMenu() {
  const modelo: MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Nova nota', accelerator: 'CmdOrCtrl+N', click: () => comando('nova-nota') },
        { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: () => comando('salvar') },
        { type: 'separator' },
        { label: 'Exportar…', accelerator: 'CmdOrCtrl+Shift+E', click: () => comando('exportar') },
        { type: 'separator' },
        { label: 'Configurações', accelerator: 'CmdOrCtrl+,', click: () => comando('configuracoes') },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', role: 'undo' },
        { label: 'Refazer', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { label: 'Selecionar tudo', role: 'selectAll' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { label: 'Alternar modo de exibição', accelerator: 'CmdOrCtrl+\\', click: () => comando('layout') },
        { label: 'Paleta de comandos', accelerator: 'CmdOrCtrl+P', click: () => comando('paleta') },
        { type: 'separator' },
        { label: 'Aproximar', role: 'zoomIn' },
        { label: 'Afastar', role: 'zoomOut' },
        { label: 'Tamanho normal', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Tela cheia', role: 'togglefullscreen' },
        { label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Janela',
      submenu: [
        { label: 'Minimizar', role: 'minimize' },
        { label: 'Fechar', role: 'close' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Manual do VellumMD', accelerator: 'F1', click: () => abrirAjuda() },
        { label: 'Atalhos de teclado', click: () => abrirAjuda('atalhos') },
        { label: 'Comandos de barra ( / )', click: () => abrirAjuda('barra') },
        { label: 'Solução de problemas', click: () => abrirAjuda('problemas') },
        { type: 'separator' },
        {
          label: 'Sobre o VellumMD',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Sobre o VellumMD',
              message: `VellumMD ${app.getVersion()}`,
              detail:
                'Editor de Markdown local-first com busca semântica e assistência por IA.\n\n' +
                'Suas notas ficam em arquivos .md na pasta que você escolher. ' +
                'Nada é enviado a servidores, exceto as chamadas de IA que você ' +
                'configurar explicitamente.\n\n' +
                'Trabalho de Conclusão de Curso\n' +
                'Otávio Freitas dos Santos',
              buttons: ['Fechar'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo));
}
