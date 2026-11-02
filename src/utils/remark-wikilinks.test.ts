import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkWikilinks } from './remark-wikilinks';

/** Mesma sequência da pré-visualização, sem KaTeX/Mermaid/realce. */
async function paraHtml(markdown: string): Promise<string> {
  const arquivo = await unified()
    .use(remarkParse)
    .use(remarkWikilinks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify)
    .process(markdown);
  return String(arquivo);
}

describe('remarkWikilinks', () => {
  it('link simples vira span com o nome da nota', async () => {
    const html = await paraHtml('Ver [[Segundo Cerebro]].');
    expect(html).toContain('data-note="Segundo Cerebro"');
    expect(html).toContain('>Segundo Cerebro</span>');
    expect(html).not.toContain('data-anchor');
  });

  it('apelido: data-note é o arquivo, o texto é o apelido', async () => {
    // Era o defeito: o miolo inteiro virava data-note e o link saía como
    // "nota inexistente", embora os backlinks o reconhecessem.
    const html = await paraHtml('Ver [[Segundo Cerebro|meu sistema]].');
    expect(html).toContain('data-note="Segundo Cerebro"');
    expect(html).toContain('>meu sistema</span>');
    expect(html).not.toContain('data-note="Segundo Cerebro|meu sistema"');
  });

  it('âncora vira data-anchor, separada do nome da nota', async () => {
    const html = await paraHtml('Ver [[Segundo Cerebro#Princípios]].');
    expect(html).toContain('data-note="Segundo Cerebro"');
    expect(html).toContain('data-anchor="Princípios"');
  });

  it('âncora com apelido mantém as três partes', async () => {
    const html = await paraHtml('Ver [[Segundo Cerebro#Princípios|os quatro passos]].');
    expect(html).toContain('data-note="Segundo Cerebro"');
    expect(html).toContain('data-anchor="Princípios"');
    expect(html).toContain('>os quatro passos</span>');
  });

  it('âncora da própria nota fica sem alvo', async () => {
    const html = await paraHtml('Ver [[#Princípios]].');
    expect(html).toContain('data-note=""');
    expect(html).toContain('data-anchor="Princípios"');
  });

  it('preserva o texto em volta e trata vários links na mesma linha', async () => {
    const html = await paraHtml('Entre [[A]] e [[B]] há texto.');
    expect(html).toContain('Entre ');
    expect(html).toContain(' e ');
    expect(html).toContain(' há texto.');
    expect(html).toContain('data-note="A"');
    expect(html).toContain('data-note="B"');
  });

  it('não mexe em texto sem wikilink', async () => {
    const html = await paraHtml('Uma frase com [colchete] solto.');
    expect(html).not.toContain('wikilink');
    expect(html).toContain('[colchete]');
  });

  it('não converte wikilink dentro de código', async () => {
    // Em `inlineCode` o nó não é do tipo text — a sintaxe fica visível, que é o
    // que se espera de documentação que explica a própria sintaxe.
    const html = await paraHtml('Escreve-se `[[Nota|apelido]]` assim.');
    expect(html).not.toContain('class="wikilink"');
    expect(html).toContain('<code>');
  });
});
