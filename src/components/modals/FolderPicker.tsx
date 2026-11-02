import { useEffect } from 'react';
import { FileNode } from '../../store/vault.store';
import { Folder, FolderOpen } from 'lucide-react';

/** Uma pasta do vault oferecida como destino. */
export interface OpcaoPasta {
  /** Caminho absoluto da pasta. */
  caminho: string;
  /** Nome exibido (nome da pasta; a raiz recebe o nome do vault). */
  rotulo: string;
  /** Profundidade na árvore — usada apenas para indentar a lista. */
  nivel: number;
}

/**
 * Separador de diretório usado por um caminho do vault.
 * Os caminhos vêm de `path.join` no processo principal, então no Windows são
 * barras invertidas — mesma detecção que o rename do FileTree já fazia.
 */
export function separadorDe(caminho: string): string {
  return caminho.includes('\\') ? '\\' : '/';
}

/** Junta pasta + nome de arquivo respeitando o separador do caminho da pasta. */
export function juntarCaminho(pasta: string, nome: string): string {
  const sep = separadorDe(pasta);
  return pasta.endsWith(sep) ? pasta + nome : pasta + sep + nome;
}

/** Pasta que contém o caminho informado. */
export function pastaDe(caminho: string): string {
  const sep = separadorDe(caminho);
  const i = caminho.lastIndexOf(sep);
  return i === -1 ? caminho : caminho.slice(0, i);
}

/**
 * Lista as pastas do vault para seleção, a RAIZ primeiro.
 * Fonte única do seletor de destino: usada pelo "Mover para…" da árvore e pelo
 * campo "Pasta" da Nova Nota.
 */
export function listarPastas(files: FileNode[], vaultPath: string): OpcaoPasta[] {
  const nomeVault = vaultPath.split(/[/\\]/).filter(Boolean).pop() ?? vaultPath;
  const opcoes: OpcaoPasta[] = [{ caminho: vaultPath, rotulo: `${nomeVault} (raiz)`, nivel: 0 }];
  const percorrer = (nodes: FileNode[], nivel: number) => {
    for (const node of nodes) {
      if (node.type !== 'folder') continue;
      opcoes.push({ caminho: node.path, rotulo: node.name, nivel });
      if (node.children) percorrer(node.children, nivel + 1);
    }
  };
  percorrer(files, 1);
  return opcoes;
}

interface FolderPickerModalProps {
  /** Título do modal, ex.: `Mover "Nota.md" para…` */
  titulo: string;
  files: FileNode[];
  vaultPath: string;
  /** Pasta onde o item já está — aparece marcada e não é clicável. */
  caminhoAtual?: string | null;
  onSelecionar: (caminho: string) => void;
  onFechar: () => void;
}

/** Seletor de pasta de destino. Reaproveita o overlay da paleta de comandos. */
export function FolderPickerModal({
  titulo, files, vaultPath, caminhoAtual, onSelecionar, onFechar,
}: FolderPickerModalProps) {
  const opcoes = listarPastas(files, vaultPath);

  // Escape fecha — mesmo comportamento dos outros modais do app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  return (
    <div className="command-palette-overlay" onClick={onFechar}>
      <div className="command-palette" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="folder-picker-title">{titulo}</div>
        <div className="command-list">
          {opcoes.map(op => {
            const atual = caminhoAtual === op.caminho;
            return (
              <div
                key={op.caminho}
                className={`command-item folder-picker-item${atual ? ' folder-picker-item--atual' : ''}`}
                onClick={() => { if (!atual) onSelecionar(op.caminho); }}
                title={op.caminho}
              >
                <span className="command-label" style={{ paddingLeft: `${op.nivel * 14}px` }}>
                  {op.nivel === 0 ? <FolderOpen size={14} /> : <Folder size={14} />}
                  {op.rotulo}
                </span>
                {atual && <span className="command-shortcut">pasta atual</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
