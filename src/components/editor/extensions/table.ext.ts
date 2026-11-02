import { DecorationSet, EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state';

/** Alinhamento de cada coluna, lido da linha separadora (:---, :---:, ---:). */
type Alinhamento = 'left' | 'center' | 'right';

interface TabelaLida {
  /** Células do cabeçalho, já sem os pipes das pontas. */
  cabecalho: string[];
  /** Linhas do corpo. */
  corpo: string[][];
  alinhamentos: Alinhamento[];
  /** Texto-fonte da tabela — usado no eq() do widget. */
  fonte: string;
}

/** Escapa o texto da célula antes de qualquer HTML (evita injeção). */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formatação inline mínima dentro da célula: negrito, itálico e código.
 * Roda SEMPRE depois do escape, por isso é seguro gerar HTML aqui.
 */
function formatarCelula(texto: string): string {
  return escaparHtml(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

class TableWidget extends WidgetType {
  constructor(private readonly tabela: TabelaLida) { super(); }

  toDOM(): HTMLElement {
    const envoltorio = document.createElement('div');
    envoltorio.className = 'cm-table-widget';

    const tabela = document.createElement('table');

    const thead = document.createElement('thead');
    const trCabecalho = document.createElement('tr');
    this.tabela.cabecalho.forEach((celula, i) => {
      const th = document.createElement('th');
      th.innerHTML = formatarCelula(celula);
      th.style.textAlign = this.tabela.alinhamentos[i] || 'left';
      trCabecalho.appendChild(th);
    });
    thead.appendChild(trCabecalho);
    tabela.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const linha of this.tabela.corpo) {
      const tr = document.createElement('tr');
      for (let i = 0; i < this.tabela.cabecalho.length; i++) {
        const td = document.createElement('td');
        td.innerHTML = formatarCelula(linha[i] ?? '');
        td.style.textAlign = this.tabela.alinhamentos[i] || 'left';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tabela.appendChild(tbody);

    envoltorio.appendChild(tabela);
    return envoltorio;
  }

  eq(other: TableWidget): boolean { return other.tabela.fonte === this.tabela.fonte; }

  // false: o CodeMirror trata os eventos dentro do widget, então clicar nele
  // move o cursor para a tabela e o código volta a ser editável (mesmo
  // comportamento dos widgets de LaTeX e Mermaid).
  ignoreEvent() { return false; }
}

/** Divide uma linha de tabela em células, descartando os pipes das pontas. */
function dividirCelulas(linha: string): string[] {
  let texto = linha.trim();
  if (texto.startsWith('|')) texto = texto.slice(1);
  if (texto.endsWith('|') && !texto.endsWith('\\|')) texto = texto.slice(0, -1);
  return texto.split('|').map(c => c.trim());
}

/**
 * Linha separadora do GFM: só pipes, hifens, dois-pontos e espaços, com pelo
 * menos um pipe e um hífen. A exigência do pipe é o que evita confundir com
 * `---` (regra horizontal / título setext).
 */
function ehSeparadora(linha: string): boolean {
  const texto = linha.trim();
  if (!texto.includes('|') || !texto.includes('-')) return false;
  if (!/^[|\-: \t]+$/.test(texto)) return false;
  return dividirCelulas(texto).every(c => /^:?-+:?$/.test(c));
}

function lerAlinhamento(celula: string): Alinhamento {
  const inicio = celula.startsWith(':');
  const fim = celula.endsWith(':');
  if (inicio && fim) return 'center';
  if (fim) return 'right';
  return 'left';
}

// IMPORTANTE: precisa ser um StateField, e não um ViewPlugin.
// Uma tabela ocupa no mínimo três linhas, e o CodeMirror proíbe decorações do
// tipo "replace" que cruzam quebras de linha vindas de um ViewPlugin — ele
// lança "RangeError: Decorations that replace line breaks may not be specified
// via plugins", o que derruba o renderer inteiro (tela branca). Mesmo motivo
// pelo qual latex.ext.ts e mermaid.ext.ts são StateField.
export const tableInlinePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },
  update(deco, tr) {
    if (!tr.docChanged && !tr.selection) return deco.map(tr.changes);
    return buildTableDecorations(tr.state);
  },
  provide: f => EditorView.decorations.from(f),
});

function buildTableDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const selection = state.selection.main;
    const doc = state.doc;
    const total = doc.lines;

    let dentroDeCerca = false;
    let numero = 1;

    while (numero <= total) {
      const linha = doc.line(numero);
      const texto = linha.text;

      // Blocos cercados (```lang) ficam de fora: o conteúdo é código, e um
      // diagrama Mermaid pode ter linhas cheias de pipes (A -->|sim| B).
      if (/^\s*(```|~~~)/.test(texto)) {
        dentroDeCerca = !dentroDeCerca;
        numero++;
        continue;
      }
      if (dentroDeCerca) { numero++; continue; }

      // Candidata a cabeçalho: tem pipe e a linha seguinte é a separadora.
      if (!texto.includes('|') || numero + 1 > total) { numero++; continue; }
      const separadora = doc.line(numero + 1);
      if (!ehSeparadora(separadora.text)) { numero++; continue; }

      const cabecalho = dividirCelulas(texto);
      const colunas = dividirCelulas(separadora.text);
      // O GFM só reconhece a tabela quando cabeçalho e separadora têm o mesmo
      // número de colunas. Divergindo, o preview também mostra texto cru —
      // então o editor faz o mesmo e segue em frente.
      if (cabecalho.length !== colunas.length) { numero++; continue; }

      // Corpo: linhas seguintes que ainda tenham pipe e não estejam vazias.
      const corpo: string[][] = [];
      let ultima = separadora;
      let proximo = numero + 2;
      while (proximo <= total) {
        const linhaCorpo = doc.line(proximo);
        const t = linhaCorpo.text;
        if (!t.trim() || !t.includes('|') || /^\s*(```|~~~)/.test(t)) break;
        corpo.push(dividirCelulas(t));
        ultima = linhaCorpo;
        proximo++;
      }

      const from = linha.from;
      const to = ultima.to;

      // Tabela sob o cursor/seleção continua como texto editável.
      if (selection.from <= to && selection.to >= from) { numero = proximo; continue; }

      builder.add(from, to, Decoration.replace({
        widget: new TableWidget({
          cabecalho,
          corpo,
          alinhamentos: colunas.map(lerAlinhamento),
          fonte: doc.sliceString(from, to),
        }),
      }));

      numero = proximo;
    }

    return builder.finish();
  } catch {
    return new RangeSetBuilder<Decoration>().finish();
  }
}
