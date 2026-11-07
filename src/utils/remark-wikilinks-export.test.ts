import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkWikilinksExport } from './remark-wikilinks-export';

function html(markdown: string, slugMap?: Record<string, string>): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkWikilinksExport(slugMap))
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

const MAPA = {
  'busca semantica': 'busca-semantica',
  'segundo cerebro': 'segundo-cerebro',
};

describe('exportação de arquivo único (PDF): sem destino', () => {
  it('não imprime os colchetes — era o defeito visto no PDF gerado', () => {
    const r = html('Relacionado: [[Busca Semantica]] · [[Segundo Cerebro]]');
    expect(r).not.toContain('[[');
    expect(r).not.toContain(']]');
  });

  it('mostra o nome da nota como texto', () => {
    expect(html('Ver [[Segundo Cerebro]].')).toContain('Ver Segundo Cerebro.');
  });

  it('com apelido, mostra o apelido e não o nome do arquivo', () => {
    const r = html('Ver [[Segundo Cerebro|meu sistema de notas]].');
    expect(r).toContain('meu sistema de notas');
    expect(r).not.toContain('Segundo Cerebro');
  });

  it('com âncora, mostra nota e seção de forma legível', () => {
    expect(html('Ver [[Segundo Cerebro#Princípios]].')).toContain('Segundo Cerebro › Princípios');
  });

  it('não cria link onde não há página de destino', () => {
    expect(html('Ver [[Segundo Cerebro]].')).not.toContain('<a');
  });

  it('preserva o texto em volta do wikilink', () => {
    expect(html('antes [[Nota]] depois')).toContain('antes Nota depois');
  });

  it('texto sem wikilink passa intacto', () => {
    expect(html('Um parágrafo comum.')).toContain('Um parágrafo comum.');
  });
});

describe('exportação de site: com mapa de slugs', () => {
  it('vira link para a página da nota', () => {
    const r = html('Ver [[Busca Semantica]].', MAPA);
    expect(r).toContain('href="busca-semantica.html"');
    expect(r).toContain('>Busca Semantica<');
  });

  it('a âncora vira fragmento no href', () => {
    const r = html('Ver [[Segundo Cerebro#Princípios]].', MAPA);
    expect(r).toContain('href="segundo-cerebro.html#principios"');
  });

  it('o apelido é o texto do link', () => {
    const r = html('Ver [[Segundo Cerebro|meu sistema]].', MAPA);
    expect(r).toContain('href="segundo-cerebro.html"');
    expect(r).toContain('>meu sistema<');
  });

  it('nota fora do mapa não vira link, mas também não mostra colchetes', () => {
    // Acontece com ligação para nota que ainda não existe. Antes saía
    // "[[Nota Futura]]" literal no meio do texto do site.
    const r = html('Ver [[Nota Futura]].', MAPA);
    expect(r).not.toContain('[[');
    expect(r).toContain('Ver Nota Futura.');
  });

  it('vários wikilinks no mesmo parágrafo', () => {
    const r = html('[[Busca Semantica]] e [[Segundo Cerebro]]', MAPA);
    expect(r).toContain('busca-semantica.html');
    expect(r).toContain('segundo-cerebro.html');
  });
});
