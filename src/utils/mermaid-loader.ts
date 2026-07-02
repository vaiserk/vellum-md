// ── Mermaid: lazy-load compartilhado + fila global de renderização ───────────
// Usado pelo Preview e pela extensão inline do editor. É essencial que ambos
// compartilhem ESTA instância e ESTA fila:
// - o Mermaid é um singleton — dois initialize() concorrentes ou renders em
//   paralelo (editor + preview) quebram com "Syntax error" espúrio;
// - o core (~600 kB) só é baixado na primeira renderização de um diagrama,
//   mantendo o chunk principal do app pequeno.
//
// Regras preservadas:
// - initialize() NUNCA roda durante um render em andamento;
// - o tema é sincronizado por MutationObserver, uma vez por mudança de tema.

type MermaidModule = typeof import('mermaid').default;

let _mermaidPromise: Promise<MermaidModule> | null = null;
let _lastMermaidTheme: 'dark' | 'default' | null = null;

function currentMermaidTheme(): 'dark' | 'default' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
}

export function getMermaid(): Promise<MermaidModule> {
  if (!_mermaidPromise) {
    _mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      _lastMermaidTheme = currentMermaidTheme();
      mermaid.initialize({ startOnLoad: false, theme: _lastMermaidTheme, securityLevel: 'loose' });
      if (typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
          const theme = currentMermaidTheme();
          if (theme === _lastMermaidTheme) return;
          _lastMermaidTheme = theme;
          mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' });
        }).observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-theme'],
        });
      }
      return mermaid;
    });
  }
  return _mermaidPromise;
}

// Fila global: serializa TODOS os mermaid.render() do app (preview + editor)
let mermaidQueue: Promise<unknown> = Promise.resolve();

export function enqueueMermaidRender(id: string, code: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    mermaidQueue = mermaidQueue.then(async () => {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(id, code);
        resolve(svg);
      } catch (err) {
        reject(err);
      }
    });
  });
}
