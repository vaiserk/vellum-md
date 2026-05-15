import React, { useEffect, useRef, useState } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { FileTree } from './FileTree';
import { BacklinksPane } from './BacklinksPane';
import { Sun, Moon, FilePlus, Settings } from 'lucide-react';
import { EmbeddingService } from '../../services/embedding.service';
import { topKSimilar } from '../../services/similarity';

type SidebarTab = 'files' | 'search' | 'tags' | 'backlinks';

interface SemanticResult {
  path: string;
  score: number;
  name: string;
}

export function Sidebar() {
  const {
    vaultPath, setVaultPath, setFiles, files, theme, setTheme, setActiveFile,
    embeddingIndex, embeddingStatus, indexingProgress, tagIndex, loadTagsOnly,
  } = useVaultStore();
  const { setSettingsOpen, embeddingApiKey, apiKey, embeddingProvider, embeddingModel } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'lexical' | 'semantic'>('lexical');
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const semanticDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenVault = async () => {
    const path = await window.electron.fs.openVault();
    if (path) {
      setVaultPath(path);
      const newFiles = await window.electron.fs.readDir(path);
      setFiles(newFiles);
    }
  };

  const handleCreateFile = async () => {
    if (!vaultPath) return;
    const inputName = await useVaultStore.getState().openPrompt('Nome da nova nota:', 'Nova Nota');
    if (!inputName) return;
    const name = inputName.endsWith('.md') ? inputName : `${inputName}.md`;
    const filePath = vaultPath + '/' + name;
    await window.electron.fs.createFile(filePath);
    const updatedFiles = await window.electron.fs.readDir(vaultPath);
    setFiles(updatedFiles);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      if (node.children) result.push(...flattenFiles(node.children));
    }
    return result;
  };

  const allFiles = flattenFiles(files);

  // Lexical search
  const lexicalResults = searchQuery.trim()
    ? allFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Semantic search with debounce
  useEffect(() => {
    if (searchMode !== 'semantic' || !searchQuery.trim() || embeddingStatus !== 'ready') {
      setSemanticResults([]);
      return;
    }

    if (semanticDebounce.current) clearTimeout(semanticDebounce.current);

    semanticDebounce.current = setTimeout(async () => {
      const effectiveKey = embeddingApiKey || apiKey;
      if (!effectiveKey || embeddingIndex.size === 0) return;

      setSemanticLoading(true);
      try {
        const queryEmbedding = await EmbeddingService.embed(
          searchQuery,
          embeddingProvider,
          embeddingModel,
          effectiveKey
        );
        const results = topKSimilar(queryEmbedding, embeddingIndex, 10).filter(r => r.score > 0.5);
        setSemanticResults(
          results.map(r => ({
            path: r.path,
            score: r.score,
            name: r.path.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? r.path,
          }))
        );
      } catch {
        setSemanticResults([]);
      } finally {
        setSemanticLoading(false);
      }
    }, 400);

    return () => {
      if (semanticDebounce.current) clearTimeout(semanticDebounce.current);
    };
  }, [searchQuery, searchMode, embeddingStatus, embeddingIndex]);

  const handleFileClick = async (file: FileNode) => {
    const content = await window.electron.fs.readFile(file.path);
    setActiveFile(file.path, content);
    setSearchQuery('');
  };

  const handleSemanticResultClick = async (path: string) => {
    const content = await window.electron.fs.readFile(path);
    setActiveFile(path, content);
    setSearchQuery('');
    setSemanticResults([]);
  };

  // Build tag list from tagIndex
  const allTags = Array.from(
    new Set([...tagIndex.values()].flat())
  ).sort();

  // Files that have the active tag
  const filesWithTag = activeTag
    ? allFiles.filter(f => {
        const tags = tagIndex.get(f.path) ?? [];
        return tags.includes(activeTag);
      })
    : [];

  const handleLoadTags = () => {
    loadTagsOnly();
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
            <button onClick={handleCreateFile} title="Nova Nota (Ctrl+N)" style={{ padding: '4px 6px', background: 'transparent', color: 'var(--text-primary)' }}>
              <FilePlus size={14} />
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} title="Configurações (Ctrl+,)" style={{ padding: '4px 6px', background: 'transparent', color: 'var(--text-primary)' }}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')} title="Arquivos">📁</button>
        <button className={`sidebar-tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')} title="Busca">🔍</button>
        <button className={`sidebar-tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')} title="Tags">🏷️</button>
        <button className={`sidebar-tab ${activeTab === 'backlinks' ? 'active' : ''}`} onClick={() => setActiveTab('backlinks')} title="Backlinks">🔗</button>
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
            {/* Mode toggle */}
            <div className="search-mode-toggle">
              <button
                className={searchMode === 'lexical' ? 'active' : ''}
                onClick={() => { setSearchMode('lexical'); setSemanticResults([]); }}
                title="Busca por nome do arquivo"
              >
                Lexical
              </button>
              <button
                className={searchMode === 'semantic' ? 'active' : ''}
                onClick={() => setSearchMode('semantic')}
                title="Busca por significado (requer indexação)"
                disabled={embeddingStatus === 'idle'}
              >
                Semântica
              </button>
            </div>

            {/* Indexing progress */}
            {embeddingStatus === 'indexing' && (
              <div className="indexing-progress">
                <div className="indexing-progress-label">
                  Indexando... {indexingProgress.current}/{indexingProgress.total}
                </div>
                <div className="indexing-progress-bar">
                  <div
                    className="indexing-progress-fill"
                    style={{
                      width: indexingProgress.total > 0
                        ? `${(indexingProgress.current / indexingProgress.total) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            )}

            <input
              className="search-input"
              placeholder={searchMode === 'semantic' ? 'Buscar por significado...' : 'Buscar nota...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            {/* Lexical results */}
            {searchMode === 'lexical' && lexicalResults.map(file => (
              <div key={file.path} className="search-result" onClick={() => handleFileClick(file)}>
                <div className="search-result-title">📄 {file.name.replace('.md', '')}</div>
              </div>
            ))}
            {searchMode === 'lexical' && searchQuery && lexicalResults.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Nenhum resultado</div>
            )}

            {/* Semantic results */}
            {searchMode === 'semantic' && semanticLoading && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Buscando...</div>
            )}
            {searchMode === 'semantic' && !semanticLoading && semanticResults.map(r => (
              <div key={r.path} className="search-result" onClick={() => handleSemanticResultClick(r.path)}>
                <div className="search-result-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📄 {r.name}</span>
                  <span className="semantic-score-badge">{Math.round(r.score * 100)}%</span>
                </div>
              </div>
            ))}
            {searchMode === 'semantic' && searchQuery && !semanticLoading && semanticResults.length === 0 && embeddingStatus === 'ready' && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Nenhum resultado semântico</div>
            )}
            {searchMode === 'semantic' && embeddingStatus !== 'ready' && embeddingStatus !== 'indexing' && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Configure a chave de embedding em Configurações para habilitar a busca semântica.
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-pane">
            {tagIndex.size === 0 && (
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Nenhuma tag encontrada no frontmatter.
                </div>
                <button style={{ fontSize: '11px' }} onClick={handleLoadTags}>
                  Carregar tags
                </button>
              </div>
            )}

            {allTags.length > 0 && (
              <>
                <div className="tag-cloud">
                  {allTags.map(tag => (
                    <span
                      key={tag}
                      className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {activeTag && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 8px 4px' }}>
                      Notas com #{activeTag}
                    </div>
                    {filesWithTag.map(f => (
                      <div key={f.path} className="search-result" onClick={() => handleFileClick(f)}>
                        <div className="search-result-title">📄 {f.name.replace('.md', '')}</div>
                      </div>
                    ))}
                    {filesWithTag.length === 0 && (
                      <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Nenhuma nota encontrada.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'backlinks' && <BacklinksPane />}
      </div>
    </div>
  );
}
