import { describe, it, expect } from 'vitest';
import { parseWikilink, slugifyAnchor } from './wikilink';

describe('parseWikilink', () => {
  it('link simples: alvo e rótulo são o mesmo texto', () => {
    expect(parseWikilink('Segundo Cerebro')).toEqual({
      target: 'Segundo Cerebro', anchor: null, label: 'Segundo Cerebro',
    });
  });

  it('apelido: o alvo é o nome do arquivo, o rótulo é o que se lê', () => {
    expect(parseWikilink('Segundo Cerebro|meu segundo cérebro')).toEqual({
      target: 'Segundo Cerebro', anchor: null, label: 'meu segundo cérebro',
    });
  });

  it('âncora: separa a seção do nome da nota', () => {
    expect(parseWikilink('Segundo Cerebro#Princípios')).toEqual({
      target: 'Segundo Cerebro', anchor: 'Princípios', label: 'Segundo Cerebro › Princípios',
    });
  });

  it('âncora com apelido: o rótulo explícito vence', () => {
    expect(parseWikilink('Segundo Cerebro#Princípios|os quatro passos')).toEqual({
      target: 'Segundo Cerebro', anchor: 'Princípios', label: 'os quatro passos',
    });
  });

  it('âncora da própria nota: alvo vazio', () => {
    expect(parseWikilink('#Princípios')).toEqual({
      target: '', anchor: 'Princípios', label: 'Princípios',
    });
  });

  it('ignora espaços em volta de cada parte', () => {
    expect(parseWikilink('  Nota  #  Seção  |  Rótulo  ')).toEqual({
      target: 'Nota', anchor: 'Seção', label: 'Rótulo',
    });
  });

  it('o rótulo pode conter | — só a primeira barra separa', () => {
    // Nome de arquivo não aceita "|" em nenhum sistema suportado; rótulo aceita.
    expect(parseWikilink('Tabelas|coluna a | coluna b')).toEqual({
      target: 'Tabelas', anchor: null, label: 'coluna a | coluna b',
    });
  });

  it('a âncora pode conter # — só a primeira cerquilha separa', () => {
    expect(parseWikilink('Nota#Seção#Subseção')).toEqual({
      target: 'Nota', anchor: 'Seção#Subseção', label: 'Nota › Seção#Subseção',
    });
  });

  it('apelido vazio volta a usar o alvo como rótulo', () => {
    expect(parseWikilink('Nota|')).toEqual({
      target: 'Nota', anchor: null, label: 'Nota',
    });
  });

  it('âncora vazia é tratada como ausente', () => {
    expect(parseWikilink('Nota#')).toEqual({
      target: 'Nota', anchor: null, label: 'Nota',
    });
  });

  it('nunca devolve rótulo vazio', () => {
    for (const bruto of ['Nota', 'Nota|', '#Seção', ' x ']) {
      expect(parseWikilink(bruto).label).not.toBe('');
    }
  });
});

describe('slugifyAnchor', () => {
  it('remove acentos e normaliza para minúsculas com hífen', () => {
    expect(slugifyAnchor('Princípios')).toBe('principios');
    expect(slugifyAnchor('Por que funciona')).toBe('por-que-funciona');
  });

  it('descarta pontuação', () => {
    expect(slugifyAnchor('Busca semântica: como funciona?')).toBe('busca-semantica-como-funciona');
  });

  it('colapsa espaços e hífens repetidos', () => {
    expect(slugifyAnchor('  A   --  B  ')).toBe('a-b');
  });

  it('é estável: aplicar duas vezes não muda o resultado', () => {
    const uma = slugifyAnchor('Método de Pesquisa');
    expect(slugifyAnchor(uma)).toBe(uma);
  });
});
