import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVaultStore } from '../../store/vault.store';

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { 
    setCommandPaletteOpen, cycleLayoutMode, setTheme, theme,
    editorView, vaultPath, setFiles
  } = useVaultStore();

  const commands: Command[] = useMemo(() => [
    // Arquivo
    {
      id: 'new-note',
      label: 'Nova Nota',
      category: 'Arquivo',
      shortcut: 'Ctrl+N',
      action: async () => {
        if (!vaultPath) return;
        const inputName = window.prompt('Nome da nova nota:', 'Nova Nota');
        if (!inputName) { close(); return; }
        const name = inputName.endsWith('.md') ? inputName : `${inputName}.md`;
        const filePath = vaultPath + '/' + name;
        await window.electron.fs.createFile(filePath);
        const files = await window.electron.fs.readDir(vaultPath);
        setFiles(files);
        close();
      }
    },
    {
      id: 'save-note',
      label: 'Salvar Manualmente',
      category: 'Arquivo',
      shortcut: 'Ctrl+S',
      action: () => {
        // Auto-save handles most, but this is for visibility
        close();
      }
    },
    {
      id: 'export-note',
      label: 'Exportar...',
      category: 'Arquivo',
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'E' }));
        close();
      }
    },
    // Editor
    {
      id: 'toggle-layout',
      label: 'Alternar Modo de Layout',
      category: 'Editor',
      shortcut: 'Ctrl+\\',
      action: () => { cycleLayoutMode(); close(); }
    },
    {
      id: 'toggle-typewriter',
      label: 'Alternar Typewriter Mode (Foco)',
      category: 'Editor',
      shortcut: 'Ctrl+Shift+T',
      action: () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'T' }));
        close();
      }
    },
    {
      id: 'bold-text',
      label: 'Negrito',
      category: 'Editor',
      shortcut: 'Ctrl+B',
      action: () => { close(); }
    },
    {
      id: 'italic-text',
      label: 'Itálico',
      category: 'Editor',
      shortcut: 'Ctrl+I',
      action: () => { close(); }
    },
    {
      id: 'insert-latex',
      label: 'Inserir Bloco LaTeX',
      category: 'Editor',
      shortcut: 'Ctrl+Shift+M',
      action: () => {
        if (editorView) {
          const pos = editorView.state.selection.main.head;
          editorView.dispatch({
            changes: { from: pos, insert: '$$\n\n$$' },
            selection: { anchor: pos + 3 }
          });
          editorView.focus();
        }
        close();
      }
    },
    {
      id: 'insert-mermaid',
      label: 'Inserir Diagrama Mermaid',
      category: 'Editor',
      shortcut: 'Ctrl+Shift+D',
      action: () => {
        if (editorView) {
          const pos = editorView.state.selection.main.head;
          editorView.dispatch({
            changes: { from: pos, insert: '```mermaid\ngraph TD\n  A --> B\n```' },
            selection: { anchor: pos + 10 }
          });
          editorView.focus();
        }
        close();
      }
    },
    {
      id: 'insert-table',
      label: 'Inserir Tabela',
      category: 'Editor',
      action: () => {
        if (editorView) {
          const pos = editorView.state.selection.main.head;
          editorView.dispatch({
            changes: { from: pos, insert: '| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n|  |  |  |\n' },
          });
          editorView.focus();
        }
        close();
      }
    },
    // Configurações e Ferramentas
    {
      id: 'toggle-ai',
      label: 'Assistente IA',
      category: 'Ferramentas',
      shortcut: 'Ctrl+Shift+A',
      action: () => {
        useVaultStore.getState().setAiPanelOpen(!useVaultStore.getState().aiPanelOpen);
        close();
      }
    },
    {
      id: 'open-settings',
      label: 'Configurações',
      category: 'Configurações',
      shortcut: 'Ctrl+,',
      action: () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: ',' }));
        close();
      }
    },
    {
      id: 'toggle-theme',
      label: `Mudar Tema (atual: ${theme})`,
      category: 'Configurações',
      action: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }
    },
  ], [vaultPath, editorView, theme]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lower) || 
      cmd.category.toLowerCase().includes(lower)
    );
  }, [query, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const close = () => setCommandPaletteOpen(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <div className="command-palette-overlay" onClick={close}>
      <div className="command-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          className="command-palette-input"
          placeholder="Buscar comando..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="command-list">
          {filteredCommands.map((cmd, i) => (
            <div 
              key={cmd.id}
              className={`command-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => cmd.action()}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="command-label">
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', minWidth: '70px' }}>
                  {cmd.category}
                </span>
                {cmd.label}
              </div>
              {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Nenhum comando encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
