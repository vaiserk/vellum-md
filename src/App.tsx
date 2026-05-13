import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Editor } from './components/editor/Editor';
import { Preview } from './components/preview/Preview';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { StatusBar } from './components/statusbar/StatusBar';
import { CommandPalette } from './components/modals/CommandPalette';
import { SettingsModal } from './components/modals/SettingsModal';
import { ExportModal } from './components/modals/ExportModal';
import { OnboardingWizard } from './components/modals/OnboardingWizard';
import { AIPanel } from './components/ai/AIPanel';
import { useVaultStore } from './store/vault.store';
import { useSettingsStore } from './store/settings.store';

function App() {
  const { vaultPath, theme, layoutMode, commandPaletteOpen, setCommandPaletteOpen, aiPanelOpen, setAiPanelOpen } = useVaultStore();
  const { settingsOpen, setSettingsOpen, fontSize, fontFamily, editorMaxWidth } = useSettingsStore();
  const [exportOpen, setExportOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Resetar para mostrar o wizard novamente
    localStorage.removeItem('vellum-onboarding-done');
    return true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--font-family', fontFamily === 'Inter' ? '"Inter", sans-serif' : fontFamily === 'Lora' ? '"Lora", serif' : fontFamily === 'JetBrains Mono' ? '"JetBrains Mono", monospace' : '"Roboto", sans-serif');
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--editor-max-width', `${editorMaxWidth}px`);
  }, [theme, fontFamily, fontSize, editorMaxWidth]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        useVaultStore.getState().cycleLayoutMode();
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const state = useVaultStore.getState();
        if (state.vaultPath) {
          const inputName = window.prompt('Nome da nova nota:', 'Nova Nota');
          if (inputName) {
            const name = inputName.endsWith('.md') ? inputName : `${inputName}.md`;
            const filePath = state.vaultPath + '/' + name;
            window.electron.fs.createFile(filePath).then(() => {
              window.electron.fs.readDir(state.vaultPath!).then(files => {
                state.setFiles(files);
              });
            });
          }
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        useVaultStore.getState().setAiPanelOpen(!useVaultStore.getState().aiPanelOpen);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setExportOpen(prev => !prev);
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(!settingsOpen);
      }
      if (e.key === 'Escape') {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (settingsOpen) setSettingsOpen(false);
        if (exportOpen) setExportOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleOpenNote = async (e: any) => {
      const noteName = e.detail?.name;
      if (noteName) {
        const state = useVaultStore.getState();
        const allFiles = state.files;
        // Search recursively for the note
        const findFile = (nodes: any[], name: string): any => {
          for (const node of nodes) {
            if (node.type === 'file' && (node.name === name || node.name === `${name}.md`)) {
              return node;
            }
            if (node.children) {
              const found = findFile(node.children, name);
              if (found) return found;
            }
          }
          return null;
        };
        const file = findFile(allFiles, noteName);
        if (file) {
          const content = await window.electron.fs.readFile(file.path);
          state.setActiveFile(file.path, content);
        } else {
          // If not found, maybe create it? (Optional, just alert for now)
          if (state.vaultPath) {
             const confirmCreate = window.confirm(`Nota '${noteName}' não encontrada. Deseja criar?`);
             if (confirmCreate) {
               const filePath = state.vaultPath + `/${noteName}.md`;
               await window.electron.fs.createFile(filePath);
               const newFiles = await window.electron.fs.readDir(state.vaultPath);
               state.setFiles(newFiles);
               state.setActiveFile(filePath, ''); // empty frontmatter will be there
             }
          }
        }
      }
    };
    window.addEventListener('vellum:open-note', handleOpenNote);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('vellum:open-note', handleOpenNote);
    };
  }, [commandPaletteOpen, settingsOpen, exportOpen]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('vellum-onboarding-done', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      {vaultPath ? (
        <div className="workspace">
          <div className={`main-content ${layoutMode}`}>
            {layoutMode !== 'preview-only' && (
              <div className="editor-pane">
                <EditorToolbar />
                <div className="editor-scroll-area">
                  <Editor />
                </div>
              </div>
            )}
            {layoutMode !== 'editor-only' && (
              <div className="preview-pane">
                <Preview />
              </div>
            )}
            {aiPanelOpen && (
              <AIPanel onClose={() => setAiPanelOpen(false)} />
            )}
          </div>
          <StatusBar />
        </div>
      ) : (
        <div className="welcome-screen">
          <h2>📜 VellumMD</h2>
          <p>Your second brain, rendered beautifully.</p>
          <p style={{ fontSize: '12px' }}>
            Abra um vault para começar a escrever.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={() => {
              window.electron.fs.openVault().then(path => {
                if (path) {
                  useVaultStore.getState().setVaultPath(path);
                  window.electron.fs.readDir(path).then(files => {
                    useVaultStore.getState().setFiles(files);
                  });
                }
              });
            }}>
              Abrir Vault
            </button>
            <button onClick={() => setSettingsOpen(true)} style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>
              ⚙️ Configurações
            </button>
          </div>
        </div>
      )}
      {commandPaletteOpen && <CommandPalette />}
      {settingsOpen && <SettingsModal />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  );
}

export default App;
