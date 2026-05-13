import React, { useMemo } from 'react';
import { useVaultStore } from '../../store/vault.store';

export function StatusBar() {
  const { activeContent, cursorPosition, saveStatus, layoutMode, typewriterMode } = useVaultStore();

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

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          {words} palavras | {chars} caracteres | ~{readTime} min
        </span>
        <span className="status-item">
          Ln {cursorPosition.line}, Col {cursorPosition.col}
        </span>
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
