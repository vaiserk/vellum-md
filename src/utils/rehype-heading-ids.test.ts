import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeHeadingIds } from './rehype-heading-ids';

/** Mesmo encadeamento usado no preview e na exportação, reduzido ao essencial. */
async function paraHtml(markdown: string): Promise<string> {
  const arquivo = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHeadingIds)
    .use(rehypeStringify)
    .process(markdown);
  return String(arquivo);
}

describe('rehypeHeadingIds', () => {
  it('dá id a títulos de todos os níveis', async () => {
    const html = await paraHtml('# Um\n\n## Dois\n\n###### Seis');
    expect(html).toContain('<h1 id="um">');
    expect(html).toContain('<h2 id="dois">');
    expect(html).toContain('<h6 id="seis">');
  });

  it('remove acentos no id', async () => {
    expect(await paraHtml('## Princípios')).toContain('<h2 id="principios">');
  });

  it('desambigua títulos repetidos, como o GitHub', async () => {
    const html = await paraHtml('## Notas\n\n## Notas\n\n## Notas');
    expect(html).toContain('id="notas"');
    expect(html).toContain('id="notas-2"');
    expect(html).toContain('id="notas-3"');
  });

  it('usa o texto completo do título, inclusive dentro de ênfase', async () => {
    expect(await paraHtml('## Por que **funciona**')).toContain('id="por-que-funciona"');
  });

  it('não toca em parágrafos nem em outros elementos', async () => {
    const html = await paraHtml('Um parágrafo.\n\n- item');
    expect(html).not.toContain('id=');
  });

  it('ignora título que não sobra nada depois da normalização', async () => {
    const html = await paraHtml('## ???');
    expect(html).toContain('<h2>');
    expect(html).not.toContain('id=');
  });
});
