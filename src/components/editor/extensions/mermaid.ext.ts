import { ViewPlugin, DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
// Loader lazy compartilhado com o Preview — mesma instância e mesma fila de
// renderização (o Mermaid é singleton; renders concorrentes se corrompem).
import { enqueueMermaidRender } from '../../../utils/mermaid-loader';

let mermaidCounter = 0;

class MermaidWidget extends WidgetType {
  private readonly code: string;
  private readonly id: string;
  private destroyed = false;

  constructor(code: string) {
    super();
    this.code = code;
    this.id = `cm-mermaid-${++mermaidCounter}`;
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'cm-mermaid-widget';
    div.setAttribute('data-mermaid-code', this.code);
    div.textContent = 'Renderizando diagrama…';
    div.style.fontStyle = 'italic';
    div.style.fontSize = '11px';
    div.style.color = 'var(--text-secondary)';

    // Async render into the div after it's attached to the DOM.
    // Guard with `destroyed` so we never write to a detached node
    // after CodeMirror has already recycled / destroyed this widget.
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      enqueueMermaidRender(this.id, this.code)
        .then((svg) => {
          if (!this.destroyed) {
            div.style.fontStyle = '';
            div.style.fontSize = '';
            div.style.color = '';
            div.innerHTML = svg;
          }
        })
        .catch(() => {
          if (!this.destroyed) {
            div.textContent = '[Mermaid: erro de sintaxe]';
            div.style.fontStyle = '';
            div.style.color = 'var(--error-color)';
            div.style.fontSize = '11px';
            div.style.padding = '4px';
          }
        });
    });

    return div;
  }

  destroy(): void {
    this.destroyed = true;
  }

  eq(other: MermaidWidget): boolean {
    return other.code === this.code;
  }

  ignoreEvent() { return false; }
}

// Regex to match ```mermaid...``` code fences
const MERMAID_FENCE_RE = /^```mermaid\n([\s\S]*?)^```/gm;

export const mermaidInlinePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildMermaidDecorations(view);
    }

    update(update: any) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildMermaidDecorations(update.view);
      }
    }
  },
  { decorations: v => v.decorations }
);

function buildMermaidDecorations(view: EditorView): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const selection = view.state.selection.main;
    const matches: Array<{ from: number; to: number; code: string }> = [];

    // Escaneia apenas os trechos visíveis do documento (visibleRanges) —
    // a versão anterior fazia doc.toString() + regex no documento INTEIRO
    // a cada tecla, o que causava lag em notas grandes.
    for (const { from: rangeFrom, to: rangeTo } of view.visibleRanges) {
      const text = view.state.doc.sliceString(rangeFrom, rangeTo);
      const re = new RegExp(MERMAID_FENCE_RE.source, 'gm');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const from = rangeFrom + m.index;
        const to = from + m[0].length;
        // Bloco sob o cursor/seleção permanece como código editável
        if (selection.from <= to && selection.to >= from) continue;
        const code = m[1].trim();
        if (code) matches.push({ from, to, code });
      }
    }

    // Sort + dedupe overlaps to satisfy RangeSetBuilder ordering requirement
    matches.sort((a, b) => a.from - b.from);
    let lastTo = -1;
    for (const { from, to, code } of matches) {
      if (from >= lastTo) {
        builder.add(from, to, Decoration.replace({ widget: new MermaidWidget(code) }));
        lastTo = to;
      }
    }

    return builder.finish();
  } catch {
    return new RangeSetBuilder<Decoration>().finish();
  }
}
