import { ViewPlugin, DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import mermaid from 'mermaid';

let mermaidCounter = 0;

class MermaidWidget extends WidgetType {
  private readonly code: string;
  private readonly id: string;

  constructor(code: string) {
    super();
    this.code = code;
    this.id = `cm-mermaid-${++mermaidCounter}`;
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'cm-mermaid-widget';
    div.setAttribute('data-mermaid-code', this.code);

    // Async render into the div after it's attached to the DOM
    requestAnimationFrame(() => {
      mermaid.render(this.id, this.code).then(({ svg }) => {
        div.innerHTML = svg;
      }).catch(() => {
        div.textContent = '[Mermaid: erro de sintaxe]';
        div.style.color = 'var(--error-color)';
        div.style.fontSize = '11px';
        div.style.padding = '4px';
      });
    });

    return div;
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
    const text = view.state.doc.toString();
    const selection = view.state.selection.main;

    let m: RegExpExecArray | null;
    const re = new RegExp(MERMAID_FENCE_RE.source, 'gm');
    let lastTo = -1;

    // Collect and sort by position to satisfy RangeSetBuilder ordering requirement
    const matches: Array<{ from: number; to: number; code: string }> = [];
    while ((m = re.exec(text)) !== null) {
      const from = m.index;
      const to = from + m[0].length;
      if (selection.from <= to && selection.to >= from) continue;
      if (from >= view.viewport.to || to <= view.viewport.from) continue;
      const code = m[1].trim();
      if (code) matches.push({ from, to, code });
    }

    matches.sort((a, b) => a.from - b.from);

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
