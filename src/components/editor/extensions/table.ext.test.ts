// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tableInlinePreview } from './table.ext';
import { latexInlinePreview } from './latex.ext';

/** Lista as faixas decoradas e o HTML de cada widget de tabela. */
function decoracoes(doc: string, cursor?: number) {
  const state = EditorState.create({
    doc,
    extensions: [tableInlinePreview],
    selection: cursor !== undefined ? { anchor: cursor } : undefined,
  });
  const set = state.field(tableInlinePreview);
  const achadas: Array<{ from: number; to: number; html: string }> = [];
  const iter = set.iter();
  while (iter.value) {
    const widget: any = (iter.value.spec as any).widget;
    achadas.push({ from: iter.from, to: iter.to, html: widget.toDOM().innerHTML });
    iter.next();
  }
  return achadas;
}

const TABELA = ['| Nome | Nota |', '| --- | ---: |', '| Ana | 10 |', '| Bia | 9 |'].join('\n');

describe('tableInlinePreview', () => {
  it('renderiza uma tabela GFM como widget', () => {
    const achadas = decoracoes(`Texto antes\n\n${TABELA}\n\nTexto depois`);
    expect(achadas).toHaveLength(1);
    expect(achadas[0].html).toContain('<th');
    expect(achadas[0].html).toContain('Nome');
    expect(achadas[0].html).toContain('Bia');
    // Alinhamento vindo da separadora (---:)
    expect(achadas[0].html).toContain('text-align: right');
  });

  it('cobre exatamente as linhas da tabela', () => {
    const doc = `Texto antes\n\n${TABELA}\n\nTexto depois`;
    const achadas = decoracoes(doc);
    expect(doc.slice(achadas[0].from, achadas[0].to)).toBe(TABELA);
  });

  it('mantém a tabela sob o cursor como texto editável', () => {
    const doc = `Texto antes\n\n${TABELA}\n`;
    expect(decoracoes(doc, doc.indexOf('Ana'))).toHaveLength(0);
  });

  it('ignora regra horizontal e título setext', () => {
    expect(decoracoes('Titulo\n---\n\ntexto')).toHaveLength(0);
    expect(decoracoes('nao e tabela\n\n---\n')).toHaveLength(0);
  });

  it('ignora conteúdo dentro de blocos cercados', () => {
    const doc = ['```mermaid', 'graph TD', '  A -->|sim| B', '  B -->|nao| C', '```'].join('\n');
    expect(decoracoes(doc)).toHaveLength(0);
  });

  it('não renderiza quando cabeçalho e separadora têm colunas diferentes', () => {
    expect(decoracoes('| a | b |\n| --- |\n| 1 | 2 |')).toHaveLength(0);
  });

  // O prefixo "nota" tira a tabela do início do documento: com o cursor na
  // posição 0 ela ficaria sob a seleção e, de propósito, segue como texto cru.
  it('escapa HTML das células', () => {
    const achadas = decoracoes('nota\n\n| a |\n| --- |\n| <img onerror=x> |');
    expect(achadas).toHaveLength(1);
    expect(achadas[0].html).not.toContain('<img');
    expect(achadas[0].html).toContain('&lt;img');
  });

  it('aplica formatação inline simples', () => {
    const achadas = decoracoes('nota\n\n| a |\n| --- |\n| **x** e `y` |');
    expect(achadas[0].html).toContain('<strong>x</strong>');
    expect(achadas[0].html).toContain('<code>y</code>');
  });

  it('lida com duas tabelas no mesmo documento', () => {
    expect(decoracoes(`nota\n\n${TABELA}\n\ntexto\n\n${TABELA}`)).toHaveLength(2);
  });

  // Regressão: a decoração "replace" da tabela cruza quebras de linha. Vinda de
  // um ViewPlugin, o CodeMirror lançaria "Decorations that replace line breaks
  // may not be specified via plugins" e derrubaria o renderer (tela branca).
  // Montar a view de verdade é o único jeito de garantir que não voltou.
  it('monta numa EditorView real sem RangeError', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const view = new EditorView({
      state: EditorState.create({
        doc: `nota\n\n${TABELA}\n\n$$\nx = 1\n$$\n`,
        extensions: [tableInlinePreview, latexInlinePreview],
      }),
      parent,
    });
    expect(parent.querySelector('.cm-table-widget')).not.toBeNull();
    // Digitar depois da tabela também não pode estourar
    expect(() => view.dispatch({ changes: { from: view.state.doc.length, insert: 'fim' } })).not.toThrow();
    view.destroy();
    parent.remove();
  });

  // Caso de risco: fórmula inline DENTRO de uma célula. As faixas de
  // tableInlinePreview e latexInlinePreview se sobrepõem, e decoração
  // "replace" sobreposta foi exatamente o que derrubou o renderer antes.
  // Aqui os dois campos são montados juntos num documento que tem a
  // sobreposição de verdade.
  it('nao estoura com formula inline dentro de celula da tabela', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const comMatematica = [
      '| Símbolo | Significado |',
      '|---|---|',
      '| $x^2$ | quadrado |',
      '| $\\alpha$ | alfa |',
    ].join('\n');

    let view: EditorView | null = null;
    expect(() => {
      view = new EditorView({
        state: EditorState.create({
          doc: `antes\n\n${comMatematica}\n\ndepois\n`,
          extensions: [tableInlinePreview, latexInlinePreview],
        }),
        parent,
      });
    }).not.toThrow();

    // Editar o documento com a sobreposição ativa também não pode estourar
    expect(() => {
      view!.dispatch({ changes: { from: 0, insert: 'X' } });
    }).not.toThrow();

    // E mover o cursor para dentro da tabela (que desfaz o widget) idem
    expect(() => {
      view!.dispatch({ selection: { anchor: 20 } });
    }).not.toThrow();

    view!.destroy();
    parent.remove();
  });
});
