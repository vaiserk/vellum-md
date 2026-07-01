// import type: apenas o tipo é usado — evita ciclo de import em runtime
// (vault.store importa flattenFiles daqui).
import type { FileNode } from '../store/vault.store';

/**
 * Achata a árvore de arquivos do vault em uma lista plana de arquivos.
 * Fonte única — antes havia 4 cópias desta função (vault.store, Sidebar,
 * BacklinksPane, ExportModal), o que gerava risco de divergência.
 */
export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    if (node.children) result.push(...flattenFiles(node.children));
  }
  return result;
}

/**
 * Conjunto (lowercase, sem extensão) dos nomes de notas conhecidas —
 * usado para detectar wikilinks quebrados no editor e no preview.
 */
export function buildKnownNotes(nodes: FileNode[]): Set<string> {
  const set = new Set<string>();
  const walk = (items: FileNode[]) => {
    for (const n of items) {
      if (n.type === 'file') set.add(n.name.replace(/\.md$/i, '').toLowerCase());
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return set;
}
