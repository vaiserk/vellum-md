import { 
  EditorView, 
  ViewPlugin, 
  Decoration, 
  DecorationSet 
} from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

const setTypewriter = StateEffect.define<boolean>();

const typewriterState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setTypewriter)) value = e.value;
    }
    return value;
  }
});

// Typewriter scroll: keeps the cursor line centered
const typewriterScrollPlugin = ViewPlugin.fromClass(
  class {
    update(update: any) {
      if (!update.state.field(typewriterState)) return;
      if (update.docChanged || update.selectionSet) {
        const view = update.view as EditorView;
        const head = view.state.selection.main.head;
        const coords = view.coordsAtPos(head);
        if (coords) {
          const editorRect = view.dom.getBoundingClientRect();
          const centerY = editorRect.top + editorRect.height / 2;
          const diff = coords.top - centerY;
          if (Math.abs(diff) > 10) {
            view.scrollDOM.scrollBy({ top: diff, behavior: 'smooth' });
          }
        }
      }
    }
  }
);

// Dim non-active lines
const typewriterDimPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: any) {
      if (update.docChanged || update.selectionSet || update.transactions.some((t: any) => t.effects.some((e: any) => e.is(setTypewriter)))) {
        this.decorations = this.build(update.view);
      }
    }
    build(view: EditorView): DecorationSet {
      if (!view.state.field(typewriterState)) return Decoration.none;
      // Just add a class to the editor — CSS handles the dimming
      return Decoration.none;
    }
  },
  { decorations: (v) => v.decorations }
);

// Toggle the typewriter class on the editor
const typewriterTheme = EditorView.baseTheme({});

export function toggleTypewriter(view: EditorView) {
  const current = view.state.field(typewriterState);
  view.dispatch({ effects: setTypewriter.of(!current) });
  if (!current) {
    view.dom.classList.add('cm-typewriter-dim');
  } else {
    view.dom.classList.remove('cm-typewriter-dim');
  }
}

export const typewriterExtension = [
  typewriterState,
  typewriterScrollPlugin,
  typewriterDimPlugin,
  typewriterTheme,
];
