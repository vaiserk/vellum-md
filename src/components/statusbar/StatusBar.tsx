import React, { useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';

export function StatusBar() {
  // useShallow: assina apenas os campos usados (re-render por tecla é inevitável
  // aqui — os contadores de palavras/caracteres são ao vivo — mas é barato)
  const { activeContent, cursorPosition, saveStatus, layoutMode, typewriterMode, lastDeleted, setLastDeleted, vaultPath } = useVaultStore(
    useShallow(s => ({
      activeContent: s.activeContent, cursorPosition: s.cursorPosition,
      saveStatus: s.saveStatus, layoutMode: s.layoutMode, typewriterMode: s.typewriterMode,
      lastDeleted: s.lastDeleted, setLastDeleted: s.setLastDeleted, vaultPath: s.vaultPath,
    }))
  );
  const [undoCountdown, setUndoCountdown] = React.useState(10);
  // Motivo da falha ao restaurar — antes `ok === false` era ignorado e o
  // banner desaparecia como se tivesse dado certo
  const [undoError, setUndoError] = React.useState<string | null>(null);

  // Nova exclusao limpa o erro anterior
  useEffect(() => {
    setUndoError(null);
  }, [lastDeleted]);

  useEffect(() => {
    if (!lastDeleted) {
      setUndoCountdown(10);
      return;
    }
    // Falhou ao restaurar: para o contador e mantem o banner com o motivo
    if (undoError) return;
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
  }, [lastDeleted, undoError]);

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
    if (!vaultPath) {
      setUndoError('nenhum vault aberto');
      return;
    }
    let ok = false;
    try {
      ok = await window.electron.fs.restoreLastDeleted(vaultPath);
    } catch (e) {
      console.error('Erro ao restaurar nota:', e);
    }
    if (!ok) {
      // Banner continua na tela: o usuario pode tentar de novo ou copiar o
      // arquivo manualmente de .vellum/trash
      setUndoError('não foi possível restaurar — veja .vellum/trash no vault');
      return;
    }
    const updatedFiles = await window.electron.fs.readDir(vaultPath);
    useVaultStore.getState().setFiles(updatedFiles);
    setLastDeleted(null);
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {lastDeleted ? (
          <span className="status-item undo-delete-banner">
            '{lastDeleted.name}' excluído
            {undoError && <span style={{ color: '#e06c75' }}> — {undoError}</span>}
            <button className="undo-delete-btn" onClick={handleUndoDelete}>
              {undoError ? '↩ Tentar de novo' : `↩ Desfazer (${undoCountdown}s)`}
            </button>
            {undoError && (
              <button className="undo-delete-btn" onClick={() => setLastDeleted(null)}>
                Dispensar
              </button>
            )}
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
