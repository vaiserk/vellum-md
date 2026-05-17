import React, { useMemo, useEffect } from 'react';
import { useVaultStore } from '../../store/vault.store';

export function StatusBar() {
  const { activeContent, cursorPosition, saveStatus, layoutMode, typewriterMode, lastDeleted, setLastDeleted, vaultPath } = useVaultStore();
  const [undoCountdown, setUndoCountdown] = React.useState(10);

  useEffect(() => {
    if (!lastDeleted) {
      setUndoCountdown(10);
      return;
    }
    setUndoCountdown(10);
    let remaining = 10;
    const interval = setInterval(() => {
      remaining -= 1;
      setUndoCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setLastDeleted(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastDeleted]);

  const { words, chars, readTime } = useMemo(() => {
    const text = activeContent || '';
    const chars = text.length;
    // Remove frontmatter for accurate count
    const stripped = text.replace(/^---[\s\S]*?^---/m, '');
    const words = stripped.split(/\s+/).filter(w => w.trim().length > 0).length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  }, [activeContent]);

  const saveLabel = {
    idle: '',
    saved: '✓ Salvo',
    saving: '● Salvando…',
    error: '✕ Erro ao salvar',
  }[saveStatus];

  const saveClass = {
    idle: '',
    saved: 'saved',
    saving: 'saving',
    error: 'error',
  }[saveStatus];

  const layoutLabel = {
    split: 'Split',
    'editor-only': 'Editor',
    'preview-only': 'Preview',
  }[layoutMode];

  const handleUndoDelete = async () => {
    if (!vaultPath) return;
    const ok = await window.electron.fs.restoreLastDeleted(vaultPath);
    if (ok) {
      const updatedFiles = await window.electron.fs.readDir(vaultPath);
      useVaultStore.getState().setFiles(updatedFiles);
    }
    setLastDeleted(null);
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {lastDeleted ? (
          <span className="status-item undo-delete-banner">
            '{lastDeleted.name}' excluído
            <button className="undo-delete-btn" onClick={handleUndoDelete}>
              ↩ Desfazer ({undoCountdown}s)
            </button>
          </span>
        ) : (
          <>
            <span className="status-item">
              {words} palavras | {chars} caracteres | ~{readTime} min
            </span>
            <span className="status-item">
              Ln {cursorPosition.line}, Col {cursorPosition.col}
            </span>
          </>
        )}
      </div>
      <div className="status-right">
        {saveStatus !== 'idle' && (
          <span className={`save-indicator ${saveClass}`}>{saveLabel}</span>
        )}
        {typewriterMode && <span className="status-item">⌨ Typewriter</span>}
        <span className="status-item">Modo: {layoutLabel}</span>
      </div>
    </div>
  );
}
