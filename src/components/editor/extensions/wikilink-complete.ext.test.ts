// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { CompletionContext } from '@codemirror/autocomplete';
import { sugestoesDeWikilink, nomesDeNota, wikilinkCompletion } from './wikilink-complete.ext';
import { useVaultStore } from '../../../store/vault.store';

const NOMES = [
  'Segundo Cerebro', 'Carga Cognitiva', 'Zettelkasten', 'Notas Atomicas',
  'Tabelas e Codigo', 'Tarefas da Semana', 'Metodo de Pesquisa',
];

describe('sugestoesDeWikilink', () => {
  it('sem termo, devolve todas as notas', () => {
    expect(sugestoesDeWikilink('', NOMES)).toEqual(NOMES);
  });

  it('filtra pelo que foi digitado', () => {
    expect(sugestoesDeWikilink('zettel', NOMES)).toEqual(['Zettelkasten']);
  });

  it('ignora a caixa das letras', () => {
    expect(sugestoesDeWikilink('ZETTEL', NOMES)).toEqual(['Zettelkasten']);
  });

  it('ignora acentos: "Métod" encontra "Metodo"', () => {
    expect(sugestoesDeWikilink('Métod', NOMES)).toEqual(['Metodo de Pesquisa']);
  });

  it('quem começa com o termo vem antes de quem só o contém', () => {
    // "Tabelas" e "Tarefas" começam com "ta"; "Notas Atomicas" apenas contém
    const r = sugestoesDeWikilink('ta', NOMES);
    expect(r.slice(0, 2)).toEqual(['Tabelas e Codigo', 'Tarefas da Semana']);
    expect(r).toContain('Notas Atomicas');
    expect(r.indexOf('Notas Atomicas')).toBeGreaterThan(1);
  });

  it('encontra por trecho no meio do nome', () => {
    expect(sugestoesDeWikilink('cerebro', NOMES)).toEqual(['Segundo Cerebro']);
  });

  it('termo sem correspondência devolve lista vazia', () => {
    expect(sugestoesDeWikilink('xyz', NOMES)).toEqual([]);
  });

  it('espaços em volta do termo não atrapalham', () => {
    expect(sugestoesDeWikilink('  zettel ', NOMES)).toEqual(['Zettelkasten']);
  });
});

describe('nomesDeNota', () => {
  const arvore: any[] = [
    { type: 'file', name: 'Nota A.md', path: '/v/Nota A.md' },
    { type: 'file', name: 'foto.png', path: '/v/foto.png' },
    {
      type: 'folder', name: 'Pesquisa', path: '/v/Pesquisa', children: [
        { type: 'file', name: 'Nota B.md', path: '/v/Pesquisa/Nota B.md' },
      ],
    },
  ];

  it('percorre subpastas e tira a extensão', () => {
    expect(nomesDeNota(arvore)).toEqual(['Nota A', 'Nota B']);
  });

  it('descarta imagens — [[foto.png]] não abriria nota nenhuma', () => {
    expect(nomesDeNota(arvore)).not.toContain('foto');
    expect(nomesDeNota(arvore)).not.toContain('foto.png');
  });
});

describe('wikilinkCompletion', () => {
  const arvore: any[] = NOMES.map(n => ({
    type: 'file', name: `${n}.md`, path: `/v/${n}.md`,
  }));

  function contexto(texto: string, pos = texto.length) {
    useVaultStore.setState({ files: arvore });
    const state = EditorState.create({ doc: texto });
    return new CompletionContext(state, pos, false);
  }

  it('não sugere nada fora de um wikilink', () => {
    expect(wikilinkCompletion(contexto('texto comum'))).toBeNull();
  });

  it('não sugere depois do wikilink fechado', () => {
    expect(wikilinkCompletion(contexto('[[Zettelkasten]] e mais texto'))).toBeNull();
  });

  it('ao digitar "[[" oferece as notas do vault', () => {
    const r = wikilinkCompletion(contexto('Ver [['));
    expect(r).not.toBeNull();
    expect(r!.options.length).toBe(NOMES.length);
    expect(r!.from).toBe(4); // posição do "[["
  });

  it('filtra conforme se digita', () => {
    const r = wikilinkCompletion(contexto('Ver [[zettel'));
    expect(r!.options.map(o => o.displayLabel)).toEqual(['Zettelkasten']);
  });

  it('a sugestão mostra o nome, não os colchetes', () => {
    const r = wikilinkCompletion(contexto('Ver [[zettel'));
    expect(r!.options[0].displayLabel).toBe('Zettelkasten');
    expect(r!.options[0].label).toBe('[[Zettelkasten]]');
  });

  it('não refiltra no CodeMirror — senão "Métod" perderia "Metodo"', () => {
    const r = wikilinkCompletion(contexto('Ver [[Métod'));
    expect(r!.filter).toBe(false);
    expect(r!.options[0].displayLabel).toBe('Metodo de Pesquisa');
  });
});

describe('wikilinkCompletion — inserção', () => {
  const arvore: any[] = [{ type: 'file', name: 'Zettelkasten.md', path: '/v/Zettelkasten.md' }];

  function aplicarEm(doc: string, pos: number) {
    useVaultStore.setState({ files: arvore });
    const view = new EditorView({
      state: EditorState.create({ doc, selection: { anchor: pos } }),
    });
    const r = wikilinkCompletion(new CompletionContext(view.state, pos, false))!;
    const opcao: any = r.options[0];
    opcao.apply(view, opcao, r.from, pos);
    const resultado = view.state.doc.toString();
    const cursor = view.state.selection.main.head;
    view.destroy();
    return { resultado, cursor };
  }

  it('insere o wikilink completo', () => {
    const { resultado } = aplicarEm('Ver [[zettel', 12);
    expect(resultado).toBe('Ver [[Zettelkasten]]');
  });

  it('consome os colchetes que o closeBrackets já fechou', () => {
    // É o caso real: digitar "[[" faz o editor inserir "]]" sozinho.
    // Sem consumir, o resultado seria "Ver [[Zettelkasten]]]]".
    const { resultado } = aplicarEm('Ver [[zettel]]', 12);
    expect(resultado).toBe('Ver [[Zettelkasten]]');
  });

  it('deixa o cursor depois do wikilink', () => {
    const { resultado, cursor } = aplicarEm('Ver [[zettel]]', 12);
    expect(cursor).toBe(resultado.length);
  });

  it('preserva o texto que vem depois', () => {
    useVaultStore.setState({ files: arvore });
    const doc = 'Ver [[zettel]] e segue';
    const view = new EditorView({
      state: EditorState.create({ doc, selection: { anchor: 12 } }),
    });
    const r = wikilinkCompletion(new CompletionContext(view.state, 12, false))!;
    const opcao: any = r.options[0];
    opcao.apply(view, opcao, r.from, 12);
    expect(view.state.doc.toString()).toBe('Ver [[Zettelkasten]] e segue');
    view.destroy();
  });
});
