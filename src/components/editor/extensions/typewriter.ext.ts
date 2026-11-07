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
      if (!update.docChanged && !update.selectionSet) return;

      const view = update.view as EditorView;

      // Ler a posição do cursor na tela DURANTE a atualização é proibido pelo
      // CodeMirror ("Reading the editor layout isn't allowed during an
      // update"). A versão anterior fazia exatamente isso: o plugin lançava,
      // o CodeMirror o desativava, e a centralização parava de funcionar sem
      // aviso nenhum. requestMeasure adia a leitura para a fase de medição e
      // separa a escrita, que é onde a rolagem pode acontecer.
      view.requestMeasure({
        read: () => {
          const coords = view.coordsAtPos(view.state.selection.main.head);
          if (!coords) return null;
          const area = view.dom.getBoundingClientRect();
          return coords.top - (area.top + area.height / 2);
        },
        write: (distancia: number | null) => {
          if (distancia === null || Math.abs(distancia) <= 10) return;
          view.scrollDOM.scrollBy({ top: distancia, behavior: 'smooth' });
        },
      });
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

      // O CSS escurece `.cm-line` e devolve opacidade a `.cm-activeLine`. Essa
      // classe, porém, só existe se a extensão highlightActiveLine estiver
      // ligada — e não está. Sem ela, nada era marcado e o modo foco escurecia
      // o texto inteiro por igual, sem destacar coisa alguma.
      //
      // Marcar aqui, em vez de ligar highlightActiveLine globalmente, mantém o
      // editor idêntico quando o modo foco está desligado.
      const linha = view.state.doc.lineAt(view.state.selection.main.head);
      return Decoration.set([
        Decoration.line({ class: 'cm-activeLine' }).range(linha.from),
      ]);
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
