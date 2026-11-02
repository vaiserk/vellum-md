import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';

// ─── Assets locais (offline) ──────────────────────────────────────────────────
// Lê arquivos das dependências de produção via require.resolve — funciona em
// dev (node_modules) e no app empacotado (asar). Elimina a dependência de CDNs:
// as exportações agora funcionam 100% offline, cumprindo o requisito do projeto
// de que LaTeX e Mermaid renderizem localmente.

function readModuleFile(spec: string): string {
  return fs.readFileSync(require.resolve(spec), 'utf-8');
}

/**
 * Lê um arquivo de dentro de um pacote ignorando o mapa `exports`.
 *
 * O reveal.js 6 declara `exports` e só publica `./reset.css`, `./reveal.css` e
 * `./theme/*` — pedir `reveal.js/dist/reset.css` por require.resolve falha com
 * "Package subpath './dist/reset.css' is not defined by exports", e a
 * exportação de slides morria com essa mensagem crua na tela.
 *
 * Resolver a raiz do pacote pelo package.json (que todo pacote expõe) e juntar
 * o caminho manualmente funciona independentemente do mapa de exports e de
 * mudanças de versão.
 */
function raizDoPacote(pacote: string): string {
  // O entry principal (".") está sempre no mapa de exports. Subindo a partir
  // dele até achar o package.json chega-se à raiz — o reveal.js 6 nem expõe
  // "./package.json", então resolvê-lo diretamente também falharia.
  let dir = path.dirname(require.resolve(pacote));
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const pai = path.dirname(dir);
    if (pai === dir) throw new Error(`Nao foi possivel localizar a raiz do pacote ${pacote}`);
    dir = pai;
  }
  return dir;
}

function readPackageFile(pacote: string, caminhoRelativo: string): string {
  return fs.readFileSync(path.join(raizDoPacote(pacote), caminhoRelativo), 'utf-8');
}

let _katexCssInline: string | null = null;
/** CSS do KaTeX com as fontes woff2 embutidas como data URIs (cacheado). */
function getKatexCssInline(): string {
  if (_katexCssInline) return _katexCssInline;
  const cssPath = require.resolve('katex/dist/katex.min.css');
  const fontsDir = path.join(path.dirname(cssPath), 'fonts');
  let css = fs.readFileSync(cssPath, 'utf-8');
  // Chromium usa woff2; as demais variantes (woff/ttf) podem falhar silenciosamente
  css = css.replace(/url\(fonts\/([^)]+\.woff2)\)/g, (match, fontFile) => {
    try {
      const data = fs.readFileSync(path.join(fontsDir, fontFile));
      return `url(data:font/woff2;base64,${data.toString('base64')})`;
    } catch {
      return match;
    }
  });
  _katexCssInline = css;
  return css;
}

let _mermaidJs: string | null = null;
function getMermaidJs(): string {
  if (!_mermaidJs) _mermaidJs = readModuleFile('mermaid/dist/mermaid.min.js');
  return _mermaidJs;
}

function getHljsCss(dark = false): string {
  return readModuleFile(`highlight.js/styles/${dark ? 'github-dark' : 'github'}.min.css`);
}

/** Escapa texto para uso seguro em HTML (títulos de notas podem conter <, & etc.). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sanitiza um título para uso como nome de arquivo. O Windows proíbe
 * \ / : * ? " < > | e nomes terminados em ponto; sem isso o diálogo de
 * salvamento recebe um defaultPath inválido.
 */
export function sanitizeFileName(name: string, fallback: string): string {
  const clean = String(name ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .trim();
  return clean || fallback;
}

// Temas válidos do reveal.js — whitelist evita path traversal via nome de tema
const REVEAL_THEMES = new Set([
  'black', 'white', 'league', 'beige', 'night', 'serif',
  'simple', 'solarized', 'moon', 'dracula', 'sky', 'blood',
]);

// ─── Shared callout CSS (used in PDF, slides, site) ───────────────────────────
const CALLOUT_CSS = `
  .callout { border-left: 4px solid; border-radius: 0 6px 6px 0; padding: 10px 14px; margin: 12px 0; }
  .callout-title { font-weight: 700; font-size: 0.9em; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
  .callout-note    { border-color: #4a9eff; background: rgba(74,158,255,0.08); }
  .callout-note    .callout-title { color: #4a9eff; }
  .callout-tip     { border-color: #3fb950; background: rgba(63,185,80,0.08); }
  .callout-tip     .callout-title { color: #3fb950; }
  .callout-warning { border-color: #d29922; background: rgba(210,153,34,0.08); }
  .callout-warning .callout-title { color: #d29922; }
  .callout-caution { border-color: #e3a14f; background: rgba(227,161,79,0.08); }
  .callout-caution .callout-title { color: #e3a14f; }
  .callout-danger  { border-color: #f85149; background: rgba(248,81,73,0.08); }
  .callout-danger  .callout-title { color: #f85149; }
  .callout-important { border-color: #a371f7; background: rgba(163,113,247,0.08); }
  .callout-important .callout-title { color: #a371f7; }
`;

// ─── Shared PDF CSS ────────────────────────────────────────────────────────────
// Fontes do sistema (Georgia/Cambria) em vez de Google Fonts — exportação offline.
const PDF_CSS = `
  body {
    font-family: Georgia, Cambria, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.75;
    color: #1a1a1a;
    max-width: 700px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  h1 { font-size: 2em; margin-top: 1em; border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; margin-top: 1em; }
  h3 { font-size: 1.25em; margin-top: 1em; }
  code {
    font-family: Consolas, 'Cascadia Mono', monospace;
    font-size: 0.85em;
    background: #f4f4f4;
    padding: 2px 4px;
    border-radius: 3px;
  }
  pre {
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
    overflow: visible;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre code { background: transparent; padding: 0; font-size: 0.9em; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; }
  th { background: #f0f0f0; }
  tr:nth-child(even) { background: #fafafa; }
  blockquote { border-left: 4px solid #5b4fcf; margin: 1em 0; padding: 0.5em 1em; background: #f8f7ff; }
  img { max-width: 100%; }
  .katex-display { overflow: visible !important; padding: 0.5em 0; text-align: center; }
  .katex-display > .katex { white-space: normal; overflow-wrap: break-word; }
  .mermaid { display: flex; justify-content: center; margin: 1.5em 0; }
  .mermaid svg { max-width: 100%; height: auto; }
  ${CALLOUT_CSS}
`;

// ─── Build HTML for PDF ───────────────────────────────────────────────────────
// Todos os assets inline (KaTeX css+fontes, highlight.js css, mermaid js) —
// nenhuma requisição de rede. window.__renderReady sinaliza de forma
// DETERMINÍSTICA quando fontes e diagramas terminaram de renderizar (substitui
// a antiga espera fixa de 3,5s que era lenta para notas simples e insuficiente
// para notas com muitos diagramas).
// baseHref: URL file:// da pasta da nota. Sem ela, uma imagem com caminho
// relativo (`![](imagens/fig1.png)`) seria procurada em os.tmpdir(), onde o
// HTML temporário é gravado, e sairia quebrada no PDF.
function buildPdfHtml(bodyContent: string, baseHref?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  ${baseHref ? `<base href="${escapeHtml(baseHref)}">` : ''}
  <style>${getKatexCssInline()}</style>
  <style>${getHljsCss(false)}</style>
  <style>${PDF_CSS}</style>
</head>
<body>
  ${bodyContent}
  <script>${getMermaidJs()}</script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    window.__renderReady = (async function() {
      document.querySelectorAll('pre code.language-mermaid, pre code[class*="language-mermaid"]').forEach(function(el) {
        var div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = el.textContent;
        el.closest('pre').replaceWith(div);
      });
      try { await mermaid.run({ querySelector: '.mermaid' }); } catch (e) {}
      try { await document.fonts.ready; } catch (e) {}
      return true;
    })();
  </script>
</body>
</html>`;
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
export function setupExportHandlers() {
  ipcMain.handle('export:pdf', async (_, options: {
    htmlContent: string;
    format: string;
    orientation: string;
    title?: string;
    notePath?: string;
    filePath?: string;
  }) => {
    let tmpPath: string | null = null;
    let win: BrowserWindow | null = null;
    try {
      let savePath = options.filePath;
      if (!savePath) {
        const result = await dialog.showSaveDialog({
          title: 'Exportar PDF',
          // Sugere o nome da nota (como já é feito nos slides). Com 'nota.pdf'
          // fixo, exportar vários capítulos sobrescrevia o anterior.
          defaultPath: `${sanitizeFileName(options.title || '', 'nota')}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Cancelado' };
        savePath = result.filePath;
      }

      win = new BrowserWindow({
        show: false,
        width: 900,
        height: 1200,
        webPreferences: { offscreen: true },
      });

      // Arquivo temporário em vez de data: URL — com o mermaid inline o HTML
      // passa de 2 MB, acima do limite de data URLs do Chromium.
      // <base> aponta para a pasta da nota, para que imagens relativas
      // resolvam a partir dela e não a partir do diretório temporário.
      let baseHref: string | undefined;
      if (options.notePath) {
        try {
          baseHref = pathToFileURL(path.dirname(options.notePath) + path.sep).href;
        } catch { /* sem base: segue sem resolver os relativos */ }
      }
      const fullHtml = buildPdfHtml(options.htmlContent, baseHref);
      tmpPath = path.join(os.tmpdir(), `vellum-pdf-${Date.now()}.html`);
      fs.writeFileSync(tmpPath, fullHtml, 'utf-8');
      await win.loadFile(tmpPath);

      // Espera determinística: fontes + diagramas prontos (teto de 15s)
      await Promise.race([
        win.webContents.executeJavaScript('window.__renderReady'),
        new Promise(r => setTimeout(r, 15000)),
      ]).catch(() => { /* segue mesmo assim */ });
      await new Promise(r => setTimeout(r, 150)); // margem para o layout assentar

      const pageSize = options.format === 'Letter' ? 'Letter' :
                       options.format === 'A5' ? 'A5' : 'A4';

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: options.orientation === 'landscape',
        pageSize: pageSize as any,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      });

      fs.writeFileSync(savePath, pdfData);
      return { success: true, path: savePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      win?.destroy();
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch { /* ignora */ } }
    }
  });

  // ─── Export Slides (Reveal.js) ─────────────────────────────────────────────
  // reveal.js agora é dependência local: o HTML gerado é 100% autocontido
  // (reveal + katex + highlight + mermaid inline) e abre offline em qualquer máquina.
  ipcMain.handle('export:slides', async (_, options: {
    htmlSlides: string[];   // Each element = HTML of one slide
    theme: string;
    transition: string;
    title: string;
    filePath?: string;
  }) => {
    try {
      let savePath = options.filePath;
      if (!savePath) {
        const result = await dialog.showSaveDialog({
          title: 'Exportar Slides',
          defaultPath: `${sanitizeFileName(options.title || '', 'slides')}.html`,
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Cancelado' };
        savePath = result.filePath;
      }

      const theme = REVEAL_THEMES.has(options.theme) ? options.theme : 'black';
      const slideSections = options.htmlSlides
        .map(html => `<section>${html}</section>`)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || 'Apresentação')}</title>
  <style>${readPackageFile('reveal.js', 'dist/reset.css')}</style>
  <style>${readPackageFile('reveal.js', 'dist/reveal.css')}</style>
  <style>${readPackageFile('reveal.js', `dist/theme/${theme}.css`)}</style>
  <style>${getKatexCssInline()}</style>
  <style>${getHljsCss(true)}</style>
  <style>
    .reveal pre { font-size: 0.75em; box-shadow: none; }
    .reveal pre code.hljs { padding: 0.75em 1em; border-radius: 6px; }
    .reveal .katex-display { overflow: visible !important; }
    .reveal .mermaid { display: flex; justify-content: center; }
    .reveal .mermaid svg { max-width: 90%; height: auto; }
    .reveal section { text-align: left; overflow-y: auto; }
    .reveal h1, .reveal h2, .reveal h3 { text-transform: none; }
    /* Callouts */
    .reveal .callout { border-left: 4px solid; border-radius: 0 6px 6px 0; padding: 8px 12px; margin: 8px 0; font-size: 0.85em; }
    .reveal .callout-title { font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
    .reveal .callout-note    { border-color: #4a9eff; background: rgba(74,158,255,0.12); }
    .reveal .callout-note    .callout-title { color: #4a9eff; }
    .reveal .callout-tip     { border-color: #3fb950; background: rgba(63,185,80,0.12); }
    .reveal .callout-tip     .callout-title { color: #3fb950; }
    .reveal .callout-warning { border-color: #d29922; background: rgba(210,153,34,0.12); }
    .reveal .callout-warning .callout-title { color: #d29922; }
    .reveal .callout-caution { border-color: #e3a14f; background: rgba(227,161,79,0.12); }
    .reveal .callout-caution .callout-title { color: #e3a14f; }
    .reveal .callout-danger  { border-color: #f85149; background: rgba(248,81,73,0.12); }
    .reveal .callout-danger  .callout-title { color: #f85149; }
    .reveal .callout-important { border-color: #a371f7; background: rgba(163,113,247,0.12); }
    .reveal .callout-important .callout-title { color: #a371f7; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slideSections}
    </div>
  </div>
  <script>${readPackageFile('reveal.js', 'dist/reveal.js')}</script>
  <script>${getMermaidJs()}</script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

    Reveal.initialize({
      hash: true,
      transition: '${options.transition || 'slide'}',
      transitionSpeed: 'default',
      controls: true,
      progress: true,
      slideNumber: true,
      plugins: []
    });

    Reveal.on('ready', function() {
      // Allow slides with more content than fits to scroll vertically
      document.querySelectorAll('.reveal .slides section').forEach(function(s) {
        s.style.overflowY = 'auto';
      });

      document.querySelectorAll('pre code.language-mermaid, .mermaid-src').forEach(function(el) {
        var div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = el.textContent;
        var pre = el.closest('pre') || el;
        pre.replaceWith(div);
      });
      mermaid.run({ querySelector: '.mermaid' });
    });
  </script>
</body>
</html>`;

      fs.writeFileSync(savePath, html, 'utf-8');
      return { success: true, path: savePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── Export Static Site ────────────────────────────────────────────────────
  ipcMain.handle('export:site', async (_, options: {
    pages: Array<{ title: string; slug: string; html: string; dir?: string }>;
    vaultName: string;
    dirPath?: string;
  }) => {
    try {
      let outDir = options.dirPath;
      if (!outDir) {
        const result = await dialog.showOpenDialog({
          title: 'Escolha a pasta de destino para o site',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || !result.filePaths[0]) return { success: false, error: 'Cancelado' };
        outDir = path.join(result.filePaths[0], `${options.vaultName || 'site'}-export`);
      }
      fs.mkdirSync(outDir, { recursive: true });

      // Assets locais copiados para o site — nada de CDN, o site abre offline
      const assetsDir = path.join(outDir, 'assets');
      fs.mkdirSync(path.join(assetsDir, 'fonts'), { recursive: true });
      const katexCssPath = require.resolve('katex/dist/katex.min.css');
      fs.copyFileSync(katexCssPath, path.join(assetsDir, 'katex.min.css'));
      const katexFontsDir = path.join(path.dirname(katexCssPath), 'fonts');
      for (const f of fs.readdirSync(katexFontsDir)) {
        fs.copyFileSync(path.join(katexFontsDir, f), path.join(assetsDir, 'fonts', f));
      }
      fs.copyFileSync(require.resolve('highlight.js/styles/github.min.css'), path.join(assetsDir, 'github.min.css'));
      fs.copyFileSync(require.resolve('mermaid/dist/mermaid.min.js'), path.join(assetsDir, 'mermaid.min.js'));

      const SITE_CSS = `
        :root { --accent: #6C63FF; --bg: #ffffff; --surface: #f7f7fb; --text: #1a1a2e; --border: #e0e0e8; --secondary: #6b7280; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
        a { color: var(--accent); text-decoration: none; } a:hover { text-decoration: underline; }
        .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
        nav { background: var(--surface); border-right: 1px solid var(--border); padding: 2rem 1.25rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        nav h2 { font-size: 1rem; font-weight: 700; color: var(--accent); margin-bottom: 1.5rem; letter-spacing: 0.04em; text-transform: uppercase; }
        nav ul { list-style: none; }
        nav li { margin: 0.25rem 0; }
        nav li a { display: block; padding: 0.35rem 0.6rem; border-radius: 6px; font-size: 0.875rem; color: var(--text); transition: background 0.15s; }
        nav li a:hover, nav li a.active { background: rgba(108,99,255,0.1); color: var(--accent); text-decoration: none; }
        main { padding: 3rem 4rem; max-width: 800px; }
        article h1 { font-size: 2.2rem; font-weight: 700; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border); }
        article h2 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 0.75rem; }
        article h3 { font-size: 1.2rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
        article p { margin: 0.75rem 0; }
        article ul, article ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        article li { margin: 0.25rem 0; }
        article pre { background: #1e1e2e; color: #cdd6f4; border-radius: 8px; padding: 1rem; overflow-x: auto; font-size: 0.85rem; margin: 1rem 0; }
        article code { font-family: 'Cascadia Code', 'JetBrains Mono', monospace; font-size: 0.85em; background: var(--surface); padding: 2px 5px; border-radius: 4px; }
        article pre code { background: transparent; padding: 0; color: inherit; }
        article blockquote { border-left: 4px solid var(--accent); padding: 0.5rem 1rem; background: rgba(108,99,255,0.06); border-radius: 0 6px 6px 0; margin: 1rem 0; color: var(--secondary); }
        article table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
        article th, article td { border: 1px solid var(--border); padding: 8px 12px; }
        article th { background: var(--surface); font-weight: 600; }
        article img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
        .mermaid { display: flex; justify-content: center; margin: 1.5rem 0; }
        .mermaid svg { max-width: 100%; }
        .katex-display { overflow: visible !important; margin: 1.25rem 0; text-align: center; }
        ${CALLOUT_CSS}
        /* Wikilinks */
        .wiki-link { color: var(--accent); text-decoration: none; border-bottom: 1px dashed var(--accent); }
        .wiki-link:hover { border-bottom-style: solid; }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } nav { position: static; height: auto; } main { padding: 1.5rem; } }
      `;

      // ─── Imagens locais referenciadas pelas notas ────────────────────────────
      // Antes só os assets de KaTeX/hljs/mermaid eram copiados, então
      // `![](imagens/fig1.png)` ficava quebrado no site. Cada imagem local é
      // copiada para assets/img/ com nome único e o src é reescrito.
      const imgDir = path.join(assetsDir, 'img');
      const copiedImages = new Map<string, string>();   // caminho absoluto → nome no site
      const usedImageNames = new Set<string>();

      const rewriteLocalImages = (html: string, baseDir?: string): string => {
        if (!baseDir) return html;
        return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/gi, (full, pre, src, post) => {
          // Ignora URLs absolutas (http:, data:, file:), protocol-relative e raiz
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(src)) return full;
          const cleanSrc = src.split(/[?#]/)[0];
          let rel = cleanSrc;
          try { rel = decodeURIComponent(cleanSrc); } catch { /* usa o valor cru */ }
          const abs = path.resolve(baseDir, rel);
          let name = copiedImages.get(abs);
          if (!name) {
            try {
              if (!fs.statSync(abs).isFile()) return full;
            } catch {
              return full;   // imagem inexistente: mantém o src original
            }
            const ext = path.extname(abs);
            const stem = sanitizeFileName(path.basename(abs, ext), 'img');
            name = `${stem}${ext}`;
            let n = 2;
            while (usedImageNames.has(name.toLowerCase())) name = `${stem}-${n++}${ext}`;
            try {
              fs.mkdirSync(imgDir, { recursive: true });
              fs.copyFileSync(abs, path.join(imgDir, name));
            } catch {
              return full;   // falha ao copiar: não reescreve
            }
            usedImageNames.add(name.toLowerCase());
            copiedImages.set(abs, name);
          }
          return `${pre}assets/img/${encodeURIComponent(name)}${post}`;
        });
      };

      const vaultTitle = escapeHtml(options.vaultName || 'Notas');
      const navLinks = options.pages
        .map(p => `<li><a href="${p.slug}.html">${escapeHtml(p.title)}</a></li>`)
        .join('\n');

      const buildPageHtml = (page: { title: string; slug: string; html: string }) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}${options.vaultName ? ' — ' + vaultTitle : ''}</title>
  <link rel="stylesheet" href="assets/katex.min.css">
  <link rel="stylesheet" href="assets/github.min.css">
  <style>${SITE_CSS}</style>
</head>
<body>
  <div class="layout">
    <nav>
      <h2>📓 ${vaultTitle}</h2>
      <ul>${navLinks}</ul>
    </nav>
    <main>
      <article>
        <h1>${escapeHtml(page.title)}</h1>
        ${page.html}
      </article>
    </main>
  </div>
  <script src="assets/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    document.querySelectorAll('pre code.language-mermaid').forEach(function(el) {
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = el.textContent;
      el.closest('pre').replaceWith(div);
    });
    mermaid.run({ querySelector: '.mermaid' });
    // Mark active link
    var cur = location.pathname.split('/').pop();
    document.querySelectorAll('nav a').forEach(function(a) {
      if (a.getAttribute('href') === cur) a.classList.add('active');
    });
  </script>
</body>
</html>`;

      // Write individual pages
      for (const page of options.pages) {
        const pageHtml = buildPageHtml({ ...page, html: rewriteLocalImages(page.html, page.dir) });
        fs.writeFileSync(path.join(outDir, `${page.slug}.html`), pageHtml, 'utf-8');
      }

      // Write index.html (capa com o índice das notas)
      // Sem `meta refresh`: ele pulava direto para uma nota arbitrária e, ao
      // voltar, redirecionava de novo — o botão Voltar ficava inutilizado.
      if (options.pages.length > 0) {
        const indexHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${vaultTitle}</title>
<style>${SITE_CSS}</style>
</head>
<body>
<div class="layout">
  <nav><h2>📓 ${vaultTitle}</h2><ul>${navLinks}</ul></nav>
  <main><article>
    <h1>📓 ${vaultTitle}</h1>
    <p>Selecione uma nota na barra lateral para começar a leitura.</p>
    <ul>${options.pages.map(p => `<li><a href="${p.slug}.html">${escapeHtml(p.title)}</a></li>`).join('\n')}</ul>
  </article></main>
</div>
<script>
  var cur = location.pathname.split('/').pop();
  document.querySelectorAll('nav a').forEach(function(a) { if (a.getAttribute('href') === cur) a.classList.add('active'); });
</script>
</body></html>`;
        fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf-8');
      }

      return { success: true, path: outDir };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}
