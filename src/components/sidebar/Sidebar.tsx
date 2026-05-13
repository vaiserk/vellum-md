import React, { useState } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { FileTree } from './FileTree';
import { BacklinksPane } from './BacklinksPane';
import { Sun, Moon, FilePlus, Settings } from 'lucide-react';

type SidebarTab = 'files' | 'search' | 'tags' | 'backlinks';

export function Sidebar() {
  const { vaultPath, setVaultPath, setFiles, files, theme, setTheme, setActiveFile } = useVaultStore();
  const { setSettingsOpen } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenVault = async () => {
    const path = await window.electron.fs.openVault();
    if (path) {
      setVaultPath(path);
      const files = await window.electron.fs.readDir(path);
      setFiles(files);
    }
  };

  const handleCreateFile = async () => {
    if (!vaultPath) return;
    const inputName = window.prompt('Nome da nova nota:', 'Nova Nota');
    if (!inputName) return; // Cancelado
    const name = inputName.endsWith('.md') ? inputName : `${inputName}.md`;
    const filePath = vaultPath + '/' + name;
    await window.electron.fs.createFile(filePath);
    const updatedFiles = await window.electron.fs.readDir(vaultPath);
    setFiles(updatedFiles);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Flatten files
  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      if (node.children) result.push(...flattenFiles(node.children));
    }
    return result;
  };

  const allFiles = flattenFiles(files);
  const searchResults = searchQuery.trim()
    ? allFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Extract tags from frontmatter (simplified)
  const allTags: string[] = [];
  allFiles.forEach(f => {
    const baseName = f.name.replace('.md', '');
    allTags.push(baseName);
  });

  const handleFileClick = async (file: FileNode) => {
    const content = await window.electron.fs.readFile(file.path);
    setActiveFile(file.path, content);
    setSearchQuery('');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={handleOpenVault} style={{ flex: 1, fontSize: '11px' }}>
            {vaultPath ? '📂 Trocar Vault' : '📂 Abrir Vault'}
          </button>
          <button onClick={handleToggleTheme} title="Mudar Tema" style={{ padding: '4px 6px', background: 'transparent', color: 'var(--text-primary)' }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {vaultPath && (
            <button onClick={handleCreateFile} title="Nova Nota" style={{ padding: '4px 6px', background: 'transparent', color: 'var(--text-primary)' }}>
              <FilePlus size={14} />
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} title="Configurações" style={{ padding: '4px 6px', background: 'transparent', color: 'var(--text-primary)' }}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Sidebar Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
          title="Arquivos"
        >📁</button>
        <button
          className={`sidebar-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="Busca"
        >🔍</button>
        <button
          className={`sidebar-tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
          title="Tags"
        >🏷️</button>
        <button
          className={`sidebar-tab ${activeTab === 'backlinks' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlinks')}
          title="Backlinks"
        >🔗</button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'files' && vaultPath && <FileTree />}
        {activeTab === 'files' && !vaultPath && (
          <div style={{ padding: '1rem', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Abra um vault para ver seus arquivos.
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-pane">
            <input
              className="search-input"
              placeholder="Buscar nota..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchResults.map(file => (
              <div key={file.path} className="search-result" onClick={() => handleFileClick(file)}>
                <div className="search-result-title">📄 {file.name.replace('.md', '')}</div>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Nenhum resultado
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-pane">
            <div className="tag-cloud">
              {allFiles.map(f => (
                <span key={f.path} className="tag-chip" onClick={() => handleFileClick(f)}>
                  {f.name.replace('.md', '')}
                </span>
              ))}
            </div>
            {allFiles.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Nenhuma nota encontrada
              </div>
            )}
          </div>
        )}

        {activeTab === 'backlinks' && <BacklinksPane />}
      </div>
    </div>
  );
}
