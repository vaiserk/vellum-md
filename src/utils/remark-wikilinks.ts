import { visit } from 'unist-util-visit';
import { parseWikilink } from './wikilink';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Transforma `[[Nota#Seção|rótulo]]` num `<span class="wikilink">` clicável.
 *
 * O destino vai em `data-note` e a seção em `data-anchor`; o texto exibido é o
 * rótulo. Antes, o miolo inteiro dos colchetes virava `data-note`: nenhuma nota
 * se chamava "Nota#Seção|rótulo", então todo link com apelido ou âncora era
 * exibido como nota inexistente, embora o painel de backlinks o reconhecesse.
 *
 * Vive fora do componente de pré-visualização para poder ser testado sem
 * carregar o pipeline inteiro (KaTeX, Mermaid, realce de código).
 */
export function remarkWikilinks() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index, parent) => {
      if (!parent || !node.value) return;
      WIKILINK_RE.lastIndex = 0;
      const matches = [...node.value.matchAll(WIKILINK_RE)];
      if (matches.length === 0) return;

      const children: any[] = [];
      let lastIndex = 0;
      for (const match of matches) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }
        const { target, anchor, label } = parseWikilink(match[1]);
        children.push({
          type: 'element',
          data: {
            hName: 'span',
            hProperties: {
              className: 'wikilink',
              'data-note': target,
              ...(anchor ? { 'data-anchor': anchor } : {}),
            },
          },
          children: [{ type: 'text', value: label }],
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...children);
    });
  };
}
