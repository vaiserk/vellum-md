import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// Content-Security-Policy aplicada APENAS no build de produção.
// O modo dev precisa de eval e websocket para o HMR do Vite; aplicar a mesma
// política nos dois ambientes quebraria o desenvolvimento. Em produção o app
// carrega de file://, então a política vai como <meta> no HTML gerado.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "script-src 'self'",
  // KaTeX e Mermaid injetam estilos inline ao renderizar
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // imagens locais do vault, data:/blob: de diagramas, e remotas em notas
  "img-src 'self' data: blob: file: https:",
  // provedores de IA usados pelo app
  "connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.groq.com",
].join('; ');

function cspOnBuild(): Plugin {
  return {
    name: 'vellum-csp-producao',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`
      );
    },
  };
}

export default defineConfig({
  plugins: [
    cspOnBuild(),
    react(),
    electron([
      {
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
});
