import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { useVaultStore } from '../../../store/vault.store';
import { flattenFiles } from '../../../utils/files';
import { isImageFile } from '../../../utils/openNote';

/**
 * Autocompletar de wikilinks: ao digitar `[[`, sugere as notas do vault.
 *
 * O RF11 promete "autocompletar e navegação entre notas", mas só a navegação
 * existia: `[[` tinha realce e Ctrl+clique, e nada mais. Quem escrevia uma
 * ligação precisava lembrar o nome exato do arquivo — justamente o esforço de
 * memória que o trabalho se propõe a reduzir.
 */

/** Texto comparável: sem acento e em minúsculas, para `Métod` achar `Metodo`. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Filtra os nomes de nota que combinam com o que já foi digitado.
 *
 * Separada da extensão para poder ser testada sem montar um editor. A ordem
 * privilegia quem começa com o termo: digitando "ta", `Tabelas e Codigo` vem
 * antes de `Notas Atomicas`, embora os dois contenham "ta".
 */
export function sugestoesDeWikilink(termo: string, nomes: string[]): string[] {
  const alvo = normalizar(termo.trim());
  if (!alvo) return nomes.slice(0, 50);

  const comecam: string[] = [];
  const contem: string[] = [];
  for (const nome of nomes) {
    const n = normalizar(nome);
    if (n.startsWith(alvo)) comecam.push(nome);
    else if (n.includes(alvo)) contem.push(nome);
  }
  return [...comecam, ...contem].slice(0, 50);
}

/** Nomes de nota do vault, sem extensão. Imagens ficam de fora: `[[foto.png]]`
 *  não abre nada no editor. */
export function nomesDeNota(files: any[]): string[] {
  return flattenFiles(files)
    .filter(f => !isImageFile(f.name))
    .map(f => f.name.replace(/\.md$/i, ''));
}

/**
 * Insere `[[Nome]]` no lugar do que foi digitado.
 *
 * O `closeBrackets` já fecha os colchetes assim que se digita `[[`, então o
 * documento costuma ter `]]` logo à frente do cursor. Sem consumi-lo, o
 * resultado seria `[[Nota]]]]`.
 */
function aplicar(nome: string) {
  return (view: EditorView, _c: unknown, from: number, to: number) => {
    const jaFechado = view.state.sliceDoc(to, to + 2) === ']]';
    const fim = jaFechado ? to + 2 : to;
    const insercao = `[[${nome}]]`;
    view.dispatch({
      changes: { from, to: fim, insert: insercao },
      selection: { anchor: from + insercao.length },
    });
  };
}

export function wikilinkCompletion(context: CompletionContext): CompletionResult | null {
  // `[[` seguido do que já foi digitado, sem fechar colchete nem quebrar linha
  const trecho = context.matchBefore(/\[\[[^\]\n]*/);
  if (!trecho) return null;

  const termo = trecho.text.slice(2);
  const nomes = nomesDeNota(useVaultStore.getState().files);
  const sugestoes = sugestoesDeWikilink(termo, nomes);
  if (sugestoes.length === 0) return null;

  return {
    from: trecho.from,
    options: sugestoes.map(nome => ({
      label: `[[${nome}]]`,
      displayLabel: nome,
      type: 'text',
      apply: aplicar(nome),
    })),
    // A filtragem já foi feita aqui, com normalização de acento; deixar o
    // CodeMirror filtrar de novo descartaria "Metodo" para a busca "Métod".
    filter: false,
  };
}
