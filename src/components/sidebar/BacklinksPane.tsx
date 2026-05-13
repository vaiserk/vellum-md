import React, { useEffect, useState } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';

export function BacklinksPane() {
  const { activeFile, files } = useVaultStore();
  const [backlinks, setBacklinks] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchBacklinks() {
      if (!activeFile) {
        setBacklinks([]);
        return;
      }

      const currentName = activeFile.split(/[/\\]/).pop()?.replace('.md', '') || '';
      if (!currentName) return;

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

      for (const file of allFiles) {
        if (file.path === activeFile) continue;
        try {
          const content = await window.electron.fs.readFile(file.path);
          if (content.includes(`[[${currentName}]]`)) {
            results.push({
              name: file.name.replace('.md', ''),
              path: file.path,
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (isMounted) setBacklinks(results);
    }

    fetchBacklinks();
    
    return () => { isMounted = false; };
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
