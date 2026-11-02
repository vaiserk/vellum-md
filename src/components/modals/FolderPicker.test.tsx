import { describe, it, expect } from 'vitest';
import { juntarCaminho, listarPastas, pastaDe, separadorDe } from './FolderPicker';
import type { FileNode } from '../../store/vault.store';

const no = (name: string, path: string, type: 'file' | 'folder', children?: FileNode[]): FileNode =>
  ({ name, path, type, children, mtime: 0 });

describe('separadorDe / juntarCaminho / pastaDe', () => {
  it('detecta o separador do caminho', () => {
    expect(separadorDe('C:\\vault\\Pesquisa')).toBe('\\');
    expect(separadorDe('/home/user/vault')).toBe('/');
  });

  it('junta pasta e nome sem duplicar o separador', () => {
    expect(juntarCaminho('C:\\vault', 'Nota.md')).toBe('C:\\vault\\Nota.md');
    expect(juntarCaminho('C:\\vault\\', 'Nota.md')).toBe('C:\\vault\\Nota.md');
    expect(juntarCaminho('/home/vault', 'Nota.md')).toBe('/home/vault/Nota.md');
  });

  it('extrai a pasta de um caminho de arquivo', () => {
    expect(pastaDe('C:\\vault\\Pesquisa\\Nota.md')).toBe('C:\\vault\\Pesquisa');
    expect(pastaDe('/home/vault/Nota.md')).toBe('/home/vault');
  });
});

describe('listarPastas', () => {
  const files: FileNode[] = [
    no('Nota.md', 'C:\\vault\\Nota.md', 'file'),
    no('Pesquisa', 'C:\\vault\\Pesquisa', 'folder', [
      no('Fontes', 'C:\\vault\\Pesquisa\\Fontes', 'folder', []),
      no('Artigo.md', 'C:\\vault\\Pesquisa\\Artigo.md', 'file'),
    ]),
  ];

  it('coloca a raiz primeiro, com o nome do vault', () => {
    const [raiz] = listarPastas(files, 'C:\\vault');
    expect(raiz.caminho).toBe('C:\\vault');
    expect(raiz.rotulo).toBe('vault (raiz)');
    expect(raiz.nivel).toBe(0);
  });

  it('lista subpastas em profundidade e ignora arquivos', () => {
    expect(listarPastas(files, 'C:\\vault').map(p => [p.rotulo, p.nivel])).toEqual([
      ['vault (raiz)', 0],
      ['Pesquisa', 1],
      ['Fontes', 2],
    ]);
  });

  it('vault sem subpastas oferece só a raiz', () => {
    expect(listarPastas([no('Nota.md', 'C:\\vault\\Nota.md', 'file')], 'C:\\vault')).toHaveLength(1);
  });
});
