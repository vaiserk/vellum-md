import { DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state';
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

// IMPORTANTE: precisa ser um StateField, e não um ViewPlugin.
// Um bloco ```mermaid``` sempre atravessa quebras de linha, e o CodeMirror
// proíbe que decorações do tipo "replace" que cruzam linhas venham de um
// ViewPlugin — ele lança "RangeError: Decorations that replace line breaks
// may not be specified via plugins", o que derrubava o renderer (tela branca)
// ao abrir qualquer nota com diagrama.
export const mermaidInlinePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildMermaidDecorations(state);
  },
  update(deco, tr) {
    if (!tr.docChanged && !tr.selection) return deco.map(tr.changes);
    return buildMermaidDecorations(tr.state);
  },
  provide: f => EditorView.decorations.from(f),
});

function buildMermaidDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const selection = state.selection.main;
    const matches: Array<{ from: number; to: number; code: string }> = [];

    // Um StateField não enxerga o viewport, então o documento é varrido
    // inteiro. O custo é aceitável: só recalcula quando o texto muda ou a
    // seleção se move, e o regex é barato perto de renderizar o diagrama.
    {
      const text = state.doc.toString();
      const re = new RegExp(MERMAID_FENCE_RE.source, 'gm');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const from = m.index;
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
