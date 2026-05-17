import React, { useEffect, useRef, useState } from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { FileTree } from './FileTree';
import { BacklinksPane } from './BacklinksPane';
import { Sun, Moon, FilePlus, Settings } from 'lucide-react';
import { EmbeddingService } from '../../services/embedding.service';
import { topKSimilar, cosineSimilarity } from '../../services/similarity';

type SidebarTab = 'files' | 'search' | 'tags' | 'backlinks';

interface SemanticResult {
  path: string;
  score: number;
  name: string;
  bestPassage: string;
}

interface UnifiedResult {
  path: string;
  name: string;
  type: 'lexical' | 'semantic';
  snippet: string | null;
  matchIdx: number;
  matchLen: number;
  score?: number;
}

export function Sidebar() {
  const {
    vaultPath, setVaultPath, setFiles, files, theme, setTheme, setActiveFile,
    embeddingIndex, passageIndex, embeddingStatus, indexingProgress, tagIndex, fileContents, loadTagsOnly,
    setNewNoteModalOpen,
  } = useVaultStore();
  const { setSettingsOpen, embeddingApiKey, apiKey, embeddingProvider, embeddingModel } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const semanticDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenVault = async () => {
    const path = await window.electron.fs.openVault();
    if (path) {
      const newFiles = await window.electron.fs.readDir(path);
      setFiles(newFiles);
      setVaultPath(path);
    }
  };

  const handleCreateFile = () => setNewNoteModalOpen(true);

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

  // Lexical search — matches filename OR file content
  const lexicalResults = searchQuery.trim()
    ? allFiles.filter(f => {
        const q = searchQuery.toLowerCase();
        if (f.name.toLowerCase().includes(q)) return true;
        const content = fileContents.get(f.path);
        return content ? content.toLowerCase().includes(q) : false;
      })
    : [];

  // Semantic search with debounce — always active when index is ready
  useEffect(() => {
    if (!searchQuery.trim() || embeddingStatus !== 'ready') {
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
          results.map(r => {
            // Find the passage most similar to the query among this note's indexed passages
            const passages = passageIndex.get(r.path) ?? [];
            let bestPassage = '';
            let bestScore = -1;
            for (const p of passages) {
              const s = cosineSimilarity(queryEmbedding, p.embedding);
              if (s > bestScore) { bestScore = s; bestPassage = p.text; }
            }
            // Fallback to first body chars if note has no passage index yet
            if (!bestPassage) {
              const content = fileContents.get(r.path) ?? '';
              bestPassage = content.replace(/^---[\s\S]*?---\n?/, '').trim().slice(0, 150).replace(/\n/g, ' ');
            }
            return {
              path: r.path,
              score: r.score,
              name: r.path.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? r.path,
              bestPassage,
            };
          })
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
  }, [searchQuery, embeddingStatus, embeddingIndex]);

  const handleFileClick = async (file: FileNode) => {
    const content = await window.electron.fs.readFile(file.path);
    setActiveFile(file.path, content);
  };

  const handleResultClick = async (path: string) => {
    const content = await window.electron.fs.readFile(path);
    setActiveFile(path, content);
  };

  // Merge lexical + semantic into a single ranked list (lexical has priority; duplicates skipped)
  const unifiedResults: UnifiedResult[] = [];
  if (searchQuery.trim()) {
    const seen = new Set<string>();
    const q = searchQuery.toLowerCase();

    for (const file of lexicalResults) {
      seen.add(file.path);
      const nameMatch = file.name.toLowerCase().includes(q);
      let snippet: string | null = null;
      let matchIdx = -1;
      let matchLen = 0;
      if (!nameMatch) {
        const content = fileContents.get(file.path) ?? '';
        const idx = content.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(content.length, idx + q.length + 60);
          const prefix = start > 0 ? '…' : '';
          snippet = prefix + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '…' : '');
          matchIdx = (idx - start) + prefix.length;
          matchLen = q.length;
        }
      }
      unifiedResults.push({ type: 'lexical', path: file.path, name: file.name, snippet, matchIdx, matchLen });
    }

    for (const r of semanticResults) {
      if (!seen.has(r.path)) {
        seen.add(r.path);
        unifiedResults.push({ type: 'semantic', path: r.path, name: r.name, score: r.score, snippet: r.bestPassage || null, matchIdx: -1, matchLen: 0 });
      }
    }
  }

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
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            {/* Unified results */}
            {semanticLoading && unifiedResults.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Buscando...</div>
            )}

            {unifiedResults.map(result => (
              <div key={result.path} className="search-result" onClick={() => handleResultClick(result.path)}>
                <div className="search-result-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {result.name.replace(/\.md$/, '')}
                  </span>
                  {result.type === 'semantic' && result.score !== undefined
                    ? <span className="semantic-score-badge">{Math.round(result.score * 100)}%</span>
                    : <span className="lexical-badge">Léxica</span>
                  }
                </div>
                {result.snippet && (
                  <div className="search-result-snippet" style={{ marginTop: '3px', lineHeight: 1.4 }}>
                    {result.matchIdx >= 0
                      ? <>
                          {result.snippet.slice(0, result.matchIdx)}
                          <mark className="search-highlight">{result.snippet.slice(result.matchIdx, result.matchIdx + result.matchLen)}</mark>
                          {result.snippet.slice(result.matchIdx + result.matchLen)}
                        </>
                      : result.snippet
                    }
                  </div>
                )}
              </div>
            ))}

            {searchQuery && !semanticLoading && unifiedResults.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Nenhum resultado</div>
            )}

            {embeddingStatus !== 'ready' && embeddingStatus !== 'indexing' && (
              <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
                Busca semântica inativa — configure uma chave de embedding em Configurações.
              </div>
            )}
            {embeddingStatus === 'ready' && embeddingIndex.size === 0 && (
              <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
                Índice semântico vazio — reindexe o vault nas Configurações.
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
