import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

export function setupExportHandlers() {
  ipcMain.handle('export:pdf', async (_, options: {
    htmlContent: string;
    format: string;
    orientation: string;
    filePath?: string;
  }) => {
    try {
      // Ask where to save
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

      // Create a hidden window for rendering
      const win = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: { offscreen: true },
      });

      // Build full HTML with styles
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
          <link href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" rel="stylesheet">
          <style>
            body {
              font-family: 'Lora', serif;
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
            code { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
            pre { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; overflow-x: auto; }
            pre code { background: transparent; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin: 1em 0; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; }
            th { background: #f0f0f0; }
            tr:nth-child(even) { background: #fafafa; }
            blockquote { border-left: 4px solid #5b4fcf; margin: 1em 0; padding: 0.5em 1em; background: #f8f7ff; }
            img { max-width: 100%; }
            .katex-display { overflow-x: auto; }
          </style>
        </head>
        <body>
          ${options.htmlContent}
        </body>
        </html>
      `;

      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

      // Wait a bit for rendering
      await new Promise(r => setTimeout(r, 1500));

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
}
