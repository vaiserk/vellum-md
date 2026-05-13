import React, { useMemo } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';

export function BacklinksPane() {
  const { activeFile, files } = useVaultStore();

  const backlinks = useMemo(() => {
    if (!activeFile) return [];

    // Get current file name (without .md for wikilink matching)
    const currentName = activeFile.split(/[/\\]/).pop()?.replace('.md', '') || '';
    if (!currentName) return [];

    // Flatten all files
    const flattenFiles = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = [];
      for (const node of nodes) {
        if (node.type === 'file') result.push(node);
        if (node.children) result.push(...flattenFiles(node.children));
      }
      return result;
    };

    const allFiles = flattenFiles(files);
    const results: { name: string; path: string }[] = [];

    // For each file, check if it references the current file via [[...]]
    for (const file of allFiles) {
      if (file.path === activeFile) continue;
      // We check by filename - in a full implementation we'd read file content
      // For now, we track the wikilink pattern
      results.push({
        name: file.name.replace('.md', ''),
        path: file.path,
      });
    }

    // Since we can't read all files synchronously, show potential linking notes
    // In production, this would be powered by an index
    return [];
  }, [activeFile, files]);

  const currentName = activeFile?.split(/[/\\]/).pop()?.replace('.md', '') || '';

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
