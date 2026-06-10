import { useMemo } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    if (node.children) result.push(...flattenFiles(node.children));
  }
  return result;
}

export function BacklinksPane() {
  const { activeFile, files, fileContents } = useVaultStore();

  const currentName = activeFile?.split(/[/\\]/).pop()?.replace('.md', '') || '';

  const backlinks = useMemo(() => {
    if (!activeFile || !currentName) return [];
    const pattern = `[[${currentName}]]`;
    return flattenFiles(files)
      .filter(f => f.path !== activeFile && fileContents.get(f.path)?.includes(pattern))
      .map(f => ({ name: f.name.replace('.md', ''), path: f.path }));
  }, [activeFile, files, fileContents, currentName]);

  return (
    <div className="backlinks-pane">
      <div className="backlinks-header">
        🔗 Backlinks para "{currentName}"
      </div>
      {!activeFile && (
        <div className="backlinks-empty">Selecione uma nota para ver backlinks.</div>
      )}
      {activeFile && backlinks.length === 0 && (
        <div className="backlinks-empty">
          Nenhuma nota referencia esta nota ainda.
          <br /><br />
          Use <code>[[{currentName}]]</code> em outras notas para criar referências.
        </div>
      )}
      {backlinks.map(bl => (
        <div key={bl.path} className="backlink-item" onClick={async () => {
          const content = await window.electron.fs.readFile(bl.path);
          useVaultStore.getState().setActiveFile(bl.path, content);
        }}>
          📄 {bl.name}
        </div>
      ))}
    </div>
  );
}
