import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';
import { flattenFiles } from '../../utils/files';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

// Verifica se algum [[Wikilink]] do conteúdo aponta para `targetName`,
// suportando aliases ([[Nota|texto]]) e âncoras de seção ([[Nota#secao]]).
function referencesNote(content: string, targetName: string): boolean {
  const target = targetName.toLowerCase();
  WIKILINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    const noteName = match[1].split('|')[0].split('#')[0].trim().toLowerCase();
    if (noteName === target) return true;
  }
  return false;
}

export function BacklinksPane() {
  // Seletores granulares: não assina activeContent — não re-renderiza a cada tecla
  const { activeFile, files, fileContents } = useVaultStore(useShallow(s => ({
    activeFile: s.activeFile, files: s.files, fileContents: s.fileContents,
  })));

  const currentName = activeFile?.split(/[/\\]/).pop()?.replace('.md', '') || '';

  const backlinks = useMemo(() => {
    if (!activeFile || !currentName) return [];
    return flattenFiles(files)
      .filter(f => f.path !== activeFile && referencesNote(fileContents.get(f.path) ?? '', currentName))
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
