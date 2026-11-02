import { DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state';
import katex from 'katex';

class InlineMathWidget extends WidgetType {
  constructor(private readonly tex: string) { super(); }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-math-widget';
    try {
      span.innerHTML = katex.renderToString(this.tex, { throwOnError: false, displayMode: false });
    } catch {
      span.textContent = this.tex;
    }
    return span;
  }

  eq(other: InlineMathWidget): boolean { return other.tex === this.tex; }
  ignoreEvent() { return false; }
}

class BlockMathWidget extends WidgetType {
  constructor(private readonly tex: string) { super(); }

  toDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'cm-math-block-widget';
    try {
      div.innerHTML = katex.renderToString(this.tex, { throwOnError: false, displayMode: true });
    } catch {
      div.textContent = this.tex;
    }
    return div;
  }

  eq(other: BlockMathWidget): boolean { return other.tex === this.tex; }
  ignoreEvent() { return false; }
}

// StateField, e não ViewPlugin: uma fórmula em bloco ($$ ... $$) pode ocupar
// várias linhas, e o CodeMirror não aceita decorações "replace" que cruzam
// quebras de linha vindas de um ViewPlugin (RangeError que derruba o renderer).
export const latexInlinePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(deco, tr) {
    if (!tr.docChanged && !tr.selection) return deco.map(tr.changes);
    return buildDecorations(tr.state);
  },
  provide: f => EditorView.decorations.from(f),
});

interface DecoSpec {
  from: number;
  to: number;
  widget: WidgetType;
}

function buildDecorations(state: EditorState): DecorationSet {
  try {
  const selection = state.selection.main;
  const specs: DecoSpec[] = [];

  // Documento inteiro: um StateField não tem acesso ao viewport.
  {
    const rangeFrom = 0;
    const text = state.doc.toString();

    // Collect block math ranges first (higher priority)
    const blockRanges: Array<[number, number]> = [];
    const blockRe = /\$\$([\s\S]+?)\$\$/g;
    let m: RegExpExecArray | null;

    while ((m = blockRe.exec(text)) !== null) {
      const from = rangeFrom + m.index;
      const to = from + m[0].length;
      if (selection.from <= to && selection.to >= from) continue;
      const tex = m[1].trim();
      if (tex) {
        blockRanges.push([from, to]);
        specs.push({ from, to, widget: new BlockMathWidget(tex) });
      }
    }

    // Collect inline math — skip positions inside block math
    const inlineRe = /\$([^$\n]+?)\$/g;
    while ((m = inlineRe.exec(text)) !== null) {
      const from = rangeFrom + m.index;
      const to = from + m[0].length;
      if (blockRanges.some(([s, e]) => from >= s && to <= e)) continue;
      if (selection.from <= to && selection.to >= from) continue;

      // Não renderiza dentro de linha de tabela. Quando o cursor entra numa
      // tabela, o widget dela some e o código volta a ser editável — se as
      // fórmulas continuassem renderizadas no meio dos pipes, a linha virava
      // uma mistura ilegível de texto cru com matemática. Na pré-visualização
      // da tabela as fórmulas aparecem normalmente.
      const linha = state.doc.lineAt(from);
      if (/^\s*\|/.test(linha.text)) continue;

      const tex = m[1].trim();
      if (tex) {
        specs.push({ from, to, widget: new InlineMathWidget(tex) });
      }
    }
  }

  // Sort by from position ascending — required by RangeSetBuilder
  specs.sort((a, b) => a.from - b.from);

  // Remove overlapping specs (keep first)
  const filtered: DecoSpec[] = [];
  let lastTo = -1;
  for (const spec of specs) {
    if (spec.from >= lastTo) {
      filtered.push(spec);
      lastTo = spec.to;
    }
  }

  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to, widget } of filtered) {
    builder.add(from, to, Decoration.replace({ widget }));
  }
  return builder.finish();
  } catch {
    return new RangeSetBuilder<Decoration>().finish();
  }
}
