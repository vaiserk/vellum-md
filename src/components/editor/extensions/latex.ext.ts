import { ViewPlugin, DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
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

export const latexInlinePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view); }
    update(update: any) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: v => v.decorations }
);

interface DecoSpec {
  from: number;
  to: number;
  widget: WidgetType;
}

function buildDecorations(view: EditorView): DecorationSet {
  try {
  const text = view.state.doc.toString();
  const selection = view.state.selection.main;
  const specs: DecoSpec[] = [];

  // Collect block math ranges first (higher priority)
  const blockRanges: Array<[number, number]> = [];
  const blockRe = /\$\$([\s\S]+?)\$\$/g;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    if (selection.from <= to && selection.to >= from) continue;
    if (!rangeInViewport(view, from, to)) continue;
    const tex = m[1].trim();
    if (tex) {
      blockRanges.push([from, to]);
      specs.push({ from, to, widget: new BlockMathWidget(tex) });
    }
  }

  // Collect inline math — skip positions inside block math
  const inlineRe = /\$([^$\n]+?)\$/g;
  while ((m = inlineRe.exec(text)) !== null) {
    const from = m.index;
    const to = from + m[0].length;
    if (blockRanges.some(([s, e]) => from >= s && to <= e)) continue;
    if (selection.from <= to && selection.to >= from) continue;
    if (!rangeInViewport(view, from, to)) continue;
    const tex = m[1].trim();
    if (tex) {
      specs.push({ from, to, widget: new InlineMathWidget(tex) });
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

function rangeInViewport(view: EditorView, from: number, to: number): boolean {
  return from < view.viewport.to && to > view.viewport.from;
}
