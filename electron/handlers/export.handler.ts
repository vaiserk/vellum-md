import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

// ─── Shared PDF CSS ────────────────────────────────────────────────────────────
const PDF_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400&display=swap');
  body {
    font-family: 'Lora', Georgia, serif;
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
    font-family: 'JetBrains Mono', monospace;
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
  pre code { background: transparent; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; }
  th { background: #f0f0f0; }
  tr:nth-child(even) { background: #fafafa; }
  blockquote { border-left: 4px solid #5b4fcf; margin: 1em 0; padding: 0.5em 1em; background: #f8f7ff; }
  img { max-width: 100%; }
  /* KaTeX — sem scrollbar no PDF */
  .katex-display {
    overflow: visible !important;
    padding: 0.5em 0;
    text-align: center;
  }
  .katex-display > .katex {
    white-space: normal;
    overflow-wrap: break-word;
  }
  /* Mermaid SVGs */
  .mermaid { display: flex; justify-content: center; margin: 1.5em 0; }
  .mermaid svg { max-width: 100%; height: auto; }
`;

// ─── Build HTML for PDF / Site pages ──────────────────────────────────────────
function buildPdfHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" rel="stylesheet">
  <style>${PDF_CSS}</style>
</head>
<body>
  ${bodyContent}
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
    // Convert <pre><code class="language-mermaid"> blocks into .mermaid divs
    document.querySelectorAll('pre code.language-mermaid, pre code[class*="language-mermaid"]').forEach(function(el) {
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = el.textContent;
      el.closest('pre').replaceWith(div);
    });
    mermaid.run({ querySelector: '.mermaid' });
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
    filePath?: string;
  }) => {
    try {
      let savePath = options.filePath;
      if (!savePath) {
        const result = await dialog.showSaveDialog({
          title: 'Exportar PDF',
          defaultPath: 'nota.pdf',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Cancelado' };
        savePath = result.filePath;
      }

      const win = new BrowserWindow({
        show: false,
        width: 900,
        height: 1200,
        webPreferences: { offscreen: true },
      });

      const fullHtml = buildPdfHtml(options.htmlContent);
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

      // Wait for mermaid to render (fonts + diagrams)
      await new Promise(r => setTimeout(r, 3500));

      const pageSize = options.format === 'Letter' ? 'Letter' :
                       options.format === 'A5' ? 'A5' : 'A4';

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        landscape: options.orientation === 'landscape',
        pageSize: pageSize as any,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      });

      fs.writeFileSync(savePath, pdfData);
      win.destroy();

      return { success: true, path: savePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // ─── Export Slides (Reveal.js) ─────────────────────────────────────────────
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
          defaultPath: `${options.title || 'slides'}.html`,
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Cancelado' };
        savePath = result.filePath;
      }

      const slideSections = options.htmlSlides
        .map(html => `<section>${html}</section>`)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'Apresentação'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/${options.theme || 'black'}.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    .reveal pre { font-size: 0.75em; }
    .reveal .katex-display { overflow: visible !important; }
    .reveal .mermaid { display: flex; justify-content: center; }
    .reveal .mermaid svg { max-width: 90%; height: auto; }
    .reveal section { text-align: left; }
    .reveal h1, .reveal h2, .reveal h3 { text-transform: none; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slideSections}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });

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
    pages: Array<{ title: string; slug: string; html: string }>;
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
        article pre code { background: transparent; padding: 0; }
        article blockquote { border-left: 4px solid var(--accent); padding: 0.5rem 1rem; background: rgba(108,99,255,0.06); border-radius: 0 6px 6px 0; margin: 1rem 0; color: var(--secondary); }
        article table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
        article th, article td { border: 1px solid var(--border); padding: 8px 12px; }
        article th { background: var(--surface); font-weight: 600; }
        article img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
        .mermaid { display: flex; justify-content: center; margin: 1.5rem 0; }
        .mermaid svg { max-width: 100%; }
        .katex-display { overflow: visible !important; margin: 1.25rem 0; text-align: center; }
        @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } nav { position: static; height: auto; } main { padding: 1.5rem; } }
      `;

      const navLinks = options.pages
        .map(p => `<li><a href="${p.slug}.html">${p.title}</a></li>`)
        .join('\n');

      const buildPageHtml = (page: { title: string; slug: string; html: string }, isIndex = false) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}${options.vaultName ? ' — ' + options.vaultName : ''}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>${SITE_CSS}</style>
</head>
<body>
  <div class="layout">
    <nav>
      <h2>📓 ${options.vaultName || 'Notas'}</h2>
      <ul>${navLinks}</ul>
    </nav>
    <main>
      <article>
        <h1>${page.title}</h1>
        ${page.html}
      </article>
    </main>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
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
        const pageHtml = buildPageHtml(page);
        fs.writeFileSync(path.join(outDir, `${page.slug}.html`), pageHtml, 'utf-8');
      }

      // Write index.html (redirect or overview)
      if (options.pages.length > 0) {
        const firstSlug = options.pages[0].slug;
        const indexHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${firstSlug}.html">
<style>${SITE_CSS}</style>
</head>
<body>
<div class="layout">
  <nav><h2>📓 ${options.vaultName || 'Notas'}</h2><ul>${navLinks}</ul></nav>
  <main><article>
    <h1>📓 ${options.vaultName || 'Notas'}</h1>
    <p>Selecione uma nota na barra lateral para começar a leitura.</p>
    <ul>${options.pages.map(p => `<li><a href="${p.slug}.html">${p.title}</a></li>`).join('\n')}</ul>
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
