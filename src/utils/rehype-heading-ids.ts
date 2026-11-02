import { visit } from 'unist-util-visit';
import { slugifyAnchor } from './wikilink';

/**
 * Dá um `id` a cada título, para que `[[Nota#Seção]]` e links `#âncora` tenham
 * onde aterrissar. Sem isto, o tratamento de âncora que já existia nos links da
 * pré-visualização nunca encontrava elemento nenhum.
 *
 * Compartilhado entre a pré-visualização e a exportação de site: se cada uma
 * gerasse o id à sua maneira, o mesmo `[[Nota#Seção]]` levaria a lugares
 * diferentes em cada saída.
 *
 * Títulos repetidos recebem sufixo (`-2`, `-3`…), como faz o GitHub — id
 * duplicado faria o navegador parar sempre no primeiro.
 */
export function rehypeHeadingIds() {
  return (tree: any) => {
    const usados = new Map<string, number>();
    visit(tree, 'element', (node: any) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      if (node.properties?.id) return;

      let texto = '';
      visit(node, 'text', (t: any) => { texto += t.value; });
      const base = slugifyAnchor(texto);
      if (!base) return;

      const vezes = (usados.get(base) ?? 0) + 1;
      usados.set(base, vezes);
      node.properties = { ...node.properties, id: vezes === 1 ? base : `${base}-${vezes}` };
    });
  };
}
