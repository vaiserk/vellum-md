// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { typewriterExtension, toggleTypewriter } from './typewriter.ext';

const DOC = ['linha um', 'linha dois', 'linha tres'].join('\n');

function montar(cursorNaLinha = 2) {
  const state = EditorState.create({ doc: DOC, extensions: typewriterExtension });
  const view = new EditorView({ state });
  const linha = view.state.doc.line(cursorNaLinha);
  view.dispatch({ selection: { anchor: linha.from } });
  return view;
}

/** Linhas marcadas com a classe que o CSS usa para devolver opacidade. */
function linhasMarcadas(view: EditorView): number[] {
  const marcadas: number[] = [];
  for (const plugin of (view as any).plugins ?? []) {
    const deco = plugin.value?.decorations;
    if (!deco || typeof deco.between !== 'function') continue;
    deco.between(0, view.state.doc.length, (from: number, _to: number, valor: any) => {
      if (valor?.spec?.class === 'cm-activeLine') {
        marcadas.push(view.state.doc.lineAt(from).number);
      }
    });
  }
  return marcadas;
}

describe('modo foco (typewriter)', () => {
  it('desligado, não marca linha nenhuma', () => {
    const view = montar();
    expect(linhasMarcadas(view)).toEqual([]);
    view.destroy();
  });

  it('ligado, marca a linha do cursor', () => {
    // O defeito corrigido: o CSS escurece todas as linhas e devolve opacidade a
    // .cm-activeLine, mas ninguém aplicava essa classe — o modo foco escurecia
    // o texto inteiro por igual, sem destacar nada.
    const view = montar(2);
    toggleTypewriter(view);
    expect(linhasMarcadas(view)).toEqual([2]);
    view.destroy();
  });

  it('acompanha o cursor ao mudar de linha', () => {
    const view = montar(1);
    toggleTypewriter(view);
    expect(linhasMarcadas(view)).toEqual([1]);

    view.dispatch({ selection: { anchor: view.state.doc.line(3).from } });
    expect(linhasMarcadas(view)).toEqual([3]);
    view.destroy();
  });

  it('marca uma única linha por vez', () => {
    const view = montar(2);
    toggleTypewriter(view);
    expect(linhasMarcadas(view)).toHaveLength(1);
    view.destroy();
  });

  it('desligar volta a não marcar nada', () => {
    const view = montar(2);
    toggleTypewriter(view);
    expect(linhasMarcadas(view)).toEqual([2]);

    toggleTypewriter(view);
    expect(linhasMarcadas(view)).toEqual([]);
    view.destroy();
  });

  it('aplica e remove a classe de escurecimento no editor', () => {
    const view = montar();
    expect(view.dom.classList.contains('cm-typewriter-dim')).toBe(false);

    toggleTypewriter(view);
    expect(view.dom.classList.contains('cm-typewriter-dim')).toBe(true);

    toggleTypewriter(view);
    expect(view.dom.classList.contains('cm-typewriter-dim')).toBe(false);
    view.destroy();
  });
});

describe('modo foco — centralização do cursor', () => {
  it('mover o cursor não derruba o plugin de rolagem', () => {
    // A versão anterior lia o layout dentro do update. O CodeMirror lançava
    // "Reading the editor layout isn't allowed during an update", DESATIVAVA o
    // plugin, e a centralização parava de funcionar em silêncio — sem erro
    // visível na interface.
    const erros: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { erros.push(args); };
    try {
      const view = montar(1);
      toggleTypewriter(view);
      view.dispatch({ selection: { anchor: view.state.doc.line(3).from } });
      view.dispatch({ changes: { from: view.state.doc.length, insert: '\nmais uma' } });
      view.destroy();
    } finally {
      console.error = original;
    }
    expect(erros).toEqual([]);
  });
});
