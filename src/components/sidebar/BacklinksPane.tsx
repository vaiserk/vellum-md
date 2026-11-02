import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';
import { flattenFiles } from '../../utils/files';
import { parseWikilink } from '../../utils/wikilink';
import { openNote } from '../../utils/openNote';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

// Verifica se algum [[Wikilink]] do conteúdo aponta para `targetName`,
// suportando apelidos ([[Nota|texto]]) e âncoras de seção ([[Nota#secao]]).
// A separação em si vem de utils/wikilink: este painel era o único lugar que
// fazia certo, e manter a regra aqui dentro foi o que permitiu que os outros
// três leitores de wikilink divergissem sem que ninguém notasse.
function referencesNote(content: string, targetName: string): boolean {
  const target = targetName.toLowerCase();
  WIKILINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    if (parseWikilink(match[1]).target.toLowerCase() === target) return true;
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
        <div key={bl.path} className="backlink-item" onClick={() => openNote(bl.path)}>
          📄 {bl.name}
        </div>
      ))}
    </div>
  );
}
