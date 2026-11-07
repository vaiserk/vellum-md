import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkWikilinks } from './remark-wikilinks';
import { rehypeHeadingIds } from './rehype-heading-ids';
import { slugifyAnchor } from './wikilink';

/**
 * Percorre o mesmo caminho da pré-visualização para a pergunta que interessa:
 * o `[[Nota#Seção]]` guarda a âncora, e o título de destino ganha o `id` que
 * essa âncora procura? Se um dos dois falhar, o salto nunca acontece, por mais
 * correto que esteja o código que rola a tela.
 */
function paraHtml(markdown: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml', 'toml'])
      .use(remarkGfm)
      .use(remarkWikilinks)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeHeadingIds)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );
}

const WIKILINKS = `# Wikilinks

Com âncora: [[Callouts#teste]]
`;

const CALLOUTS = `# Callouts

Blocos de destaque.

# teste
`;

describe('pipeline: origem da âncora', () => {
  it('o wikilink guarda destino e seção em atributos separados', () => {
    const html = paraHtml(WIKILINKS);
    expect(html).toContain('data-note="Callouts"');
    expect(html).toContain('data-anchor="teste"');
  });

  it('o texto exibido não vaza a sintaxe', () => {
    expect(paraHtml(WIKILINKS)).toContain('Callouts › teste');
  });
});

describe('pipeline: destino da âncora', () => {
  it('o título de destino recebe id', () => {
    expect(paraHtml(CALLOUTS)).toContain('<h1 id="teste">teste</h1>');
  });

  it('o id do título é exatamente o que a âncora procura', () => {
    // O elo da corrente: quem gera o id e quem gera o seletor têm de combinar.
    const html = paraHtml(CALLOUTS);
    expect(html).toContain(`id="${slugifyAnchor('teste')}"`);
  });

  it('acento no título também combina', () => {
    const html = paraHtml('## Princípios\n');
    expect(html).toContain(`id="${slugifyAnchor('Princípios')}"`);
    expect(html).toContain('id="principios"');
  });

  it('o frontmatter não desloca nem engole o título', () => {
    const comFrontmatter = `---\ntitle: "Callouts"\ntags: [a]\n---\n\n${CALLOUTS}`;
    expect(paraHtml(comFrontmatter)).toContain('<h1 id="teste">teste</h1>');
  });
});
