/**
 * Análise de um wikilink `[[alvo#âncora|rótulo]]`.
 *
 * Fonte única. Antes, cada lugar que lia wikilinks tinha a sua própria regra, e
 * elas DIVERGIAM: o painel de backlinks já separava apelido e âncora, mas a
 * pré-visualização, o editor e a exportação de site usavam o conteúdo bruto dos
 * colchetes como nome de arquivo. Resultado: `[[Nota|apelido]]` contava como
 * backlink, mas aparecia riscado como "nota inexistente" no preview e no editor,
 * e sumia do site exportado — três comportamentos diferentes para o mesmo texto.
 */
export interface Wikilink {
  /** Nome da nota, sem extensão. Vazio quando o link é só uma âncora da própria nota (`[[#Seção]]`). */
  target: string;
  /** Seção de destino, sem o `#`. `null` quando não há âncora. */
  anchor: string | null;
  /** O que o leitor vê. */
  label: string;
}

/**
 * Separa `[[alvo#âncora|rótulo]]` em suas partes.
 *
 * O `|` separa no PRIMEIRO caractere: um rótulo pode conter `|` (tabelas
 * Markdown, por exemplo), mas o nome de arquivo não pode — em nenhum sistema
 * de arquivos suportado. O `#` também separa no primeiro: o nome do arquivo
 * vem antes, e o resto é o caminho da seção.
 *
 * @param bruto o miolo dos colchetes, sem `[[` e `]]`
 */
export function parseWikilink(bruto: string): Wikilink {
  const posBarra = bruto.indexOf('|');
  const alvoComAncora = (posBarra === -1 ? bruto : bruto.slice(0, posBarra)).trim();
  const rotulo = posBarra === -1 ? '' : bruto.slice(posBarra + 1).trim();

  const posCerquilha = alvoComAncora.indexOf('#');
  const target = (posCerquilha === -1 ? alvoComAncora : alvoComAncora.slice(0, posCerquilha)).trim();
  const ancoraBruta = posCerquilha === -1 ? '' : alvoComAncora.slice(posCerquilha + 1).trim();
  const anchor = ancoraBruta || null;

  // Sem rótulo explícito, o leitor vê o alvo. Com âncora, "Nota › Seção" deixa
  // claro que o destino é um trecho, e não a nota inteira.
  const label =
    rotulo ||
    (target && anchor ? `${target} › ${anchor}` : null) ||
    target ||
    anchor ||
    bruto.trim();

  return { target, anchor, label };
}

/**
 * Identificador de um título para navegação por âncora.
 *
 * Precisa ser estável entre a pré-visualização e a exportação de site, senão o
 * mesmo `[[Nota#Seção]]` levaria a lugares diferentes em cada saída. Acentos são
 * removidos porque um id com acento, embora válido em HTML5, é frágil quando
 * passa por URL.
 */
export function slugifyAnchor(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
