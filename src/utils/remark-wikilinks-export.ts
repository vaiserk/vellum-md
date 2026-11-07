import { visit } from 'unist-util-visit';
import { parseWikilink, slugifyAnchor } from './wikilink';

/**
 * Trata `[[Nota#Seção|rótulo]]` nas três saídas de exportação.
 *
 * Com `slugMap` (site estático), o wikilink vira um `<a>` para a página da
 * nota. Sem ele — PDF e slides, que são documentos de arquivo único — não há
 * para onde apontar, então sobra o **rótulo como texto**.
 *
 * O que não pode acontecer, e acontecia, é o colchete duplo vazar para a saída.
 * Só a exportação de site usava este tratamento; o PDF e os slides montavam o
 * HTML sem ele, e uma linha como `Relacionado: [[Busca Semantica]]` era
 * impressa literalmente, com os colchetes. Numa figura cujo argumento é a
 * fidelidade da conversão, era o detalhe que a desmentia.
 *
 * @param slugMap  nome da nota em minúsculas → slug do arquivo .html.
 *                 Vazio para saídas de arquivo único.
 */
export function remarkWikilinksExport(slugMap: Record<string, string> = {}) {
  return function plugin() {
    return (tree: any) => {
      visit(tree, 'text', (node: any, index: any, parent: any) => {
        if (!parent || !node.value) return;
        const regex = /\[\[([^\]]+)\]\]/g;
        const matches = [...node.value.matchAll(regex)];
        if (!matches.length) return;

        const children: any[] = [];
        let lastIndex = 0;
        for (const match of matches) {
          if (match.index > lastIndex) {
            children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
          }
          const { target, anchor, label } = parseWikilink(match[1]);
          const slug = slugMap[target.toLowerCase()];
          if (slug) {
            children.push({
              type: 'element',
              data: {
                hName: 'a',
                hProperties: {
                  href: `${slug}.html${anchor ? `#${slugifyAnchor(anchor)}` : ''}`,
                  className: 'wiki-link',
                },
              },
              children: [{ type: 'text', value: label }],
            });
          } else {
            // Sem destino: o leitor vê o rótulo, nunca a sintaxe.
            children.push({ type: 'text', value: label });
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < node.value.length) {
          children.push({ type: 'text', value: node.value.slice(lastIndex) });
        }
        parent.children.splice(index, 1, ...children);
      });
    };
  };
}
