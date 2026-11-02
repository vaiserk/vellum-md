import { describe, it, expect, vi } from 'vitest';

// 'electron' é substituído por um duplo: os testes exercitam só a codificação
// pura do nome na lixeira, sem registrar handlers IPC nem tocar no disco.
vi.mock('electron', () => ({
  shell: { trashItem: vi.fn(), openPath: vi.fn() },
  app: { getPath: vi.fn(() => '/tmp/userData') },
}));

const { TRASH_SEP, encodeTrashPath, decodeTrashPath } = await import('./fs.handler');

// O separador é passado explicitamente para que o teste valide as duas
// convenções de caminho independentemente do SO onde ele roda.
const WIN = '\\';
const POSIX = '/';

describe('encodeTrashPath', () => {
  it('troca os separadores de diretório por __SLASH__', () => {
    expect(TRASH_SEP).toBe('__SLASH__');
    expect(encodeTrashPath('pesquisa/capitulo-3/nota.md', POSIX)).toBe(
      'pesquisa__SLASH__capitulo-3__SLASH__nota.md'
    );
    expect(encodeTrashPath('pesquisa\\capitulo-3\\nota.md', WIN)).toBe(
      'pesquisa__SLASH__capitulo-3__SLASH__nota.md'
    );
  });

  it('deixa intacto um arquivo na raiz do vault', () => {
    expect(encodeTrashPath('nota.md', POSIX)).toBe('nota.md');
  });
});

describe('decodeTrashPath', () => {
  it('remove o prefixo de timestamp e restaura os separadores', () => {
    expect(decodeTrashPath('1730000000000_pesquisa__SLASH__nota.md', POSIX)).toBe(
      'pesquisa/nota.md'
    );
    expect(decodeTrashPath('1730000000000_pesquisa__SLASH__nota.md', WIN)).toBe(
      'pesquisa\\nota.md'
    );
  });

  it('usa o nome inteiro quando não há prefixo de timestamp', () => {
    expect(decodeTrashPath('nota-sem-prefixo.md', POSIX)).toBe('nota-sem-prefixo.md');
  });

  it('preserva underscores e dígitos do nome original da nota', () => {
    // só o primeiro bloco de dígitos seguido de _ é o timestamp
    expect(decodeTrashPath('1730000000000_notas_2026__SLASH__cap_1.md', POSIX)).toBe(
      'notas_2026/cap_1.md'
    );
  });
});

describe('ida e volta (round-trip)', () => {
  it.each([
    ['nota.md'],
    ['pasta/nota.md'],
    ['a/b/c/d/nota longa com espaços.md'],
    ['imagens/figura-1.png'],
  ])('%s sobrevive a codificar + decodificar', (relPath) => {
    const trashName = `${Date.now()}_${encodeTrashPath(relPath, POSIX)}`;
    expect(decodeTrashPath(trashName, POSIX)).toBe(relPath);
  });

  it('funciona com separador do Windows em caminhos aninhados', () => {
    const relPath = 'tcc\\capitulo 3\\metodologia.md';
    const trashName = `${Date.now()}_${encodeTrashPath(relPath, WIN)}`;
    expect(decodeTrashPath(trashName, WIN)).toBe(relPath);
  });
});
