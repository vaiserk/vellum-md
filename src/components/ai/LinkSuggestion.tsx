import { useEffect, useRef, useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { EmbeddingService } from '../../services/embedding.service';
import { topKSimilar } from '../../services/similarity';

interface Suggestion {
  path: string;
  score: number;
  name: string;
}

export function LinkSuggestion() {
  const { activeContent, activeFile, embeddingIndex, embeddingStatus, editorView } = useVaultStore();
  const { suggestConnections, embeddingApiKey, apiKey, embeddingProvider, embeddingModel } = useSettingsStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visible, setVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFileRef = useRef<string | null>(null);

  // Reset toast when changing files
  useEffect(() => {
    if (activeFile !== lastFileRef.current) {
      lastFileRef.current = activeFile;
      setVisible(false);
      setSuggestions([]);
    }
  }, [activeFile]);

  useEffect(() => {
    if (!suggestConnections || embeddingStatus !== 'ready' || !activeContent || !activeFile) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const queryText = activeContent.slice(-400);
      if (queryText.trim().length < 30) return;

      const effectiveKey = embeddingApiKey || apiKey;
      if (!effectiveKey) return;

      try {
        const queryEmbedding = await EmbeddingService.embed(
          queryText,
          embeddingProvider,
          embeddingModel,
          effectiveKey
        );

        const indexWithoutCurrent = new Map(
          [...embeddingIndex.entries()].filter(([path]) => path !== activeFile)
        );

        const results = topKSimilar(queryEmbedding, indexWithoutCurrent, 3).filter(
          r => r.score > 0.72
        );

        if (results.length > 0) {
          setSuggestions(
            results.map(r => ({
              path: r.path,
              score: r.score,
              name: r.path.split(/[/\\]/).pop()?.replace(/\.md$/, '') ?? r.path,
            }))
          );
          setVisible(true);
        }
      } catch {
        // silent — don't disrupt writing flow
      }
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeContent, activeFile, embeddingStatus, suggestConnections]);

  if (!visible || suggestions.length === 0) return null;

  const insertWikilink = (name: string) => {
    if (editorView) {
      const { from } = editorView.state.selection.main;
      editorView.dispatch({ changes: { from, insert: `[[${name}]]` } });
    }
    setVisible(false);
  };

  return (
    <div className="link-suggestion-toast">
      <div className="link-suggestion-header">
        <span>💡 Notas relacionadas</span>
        <button className="link-suggestion-close" onClick={() => setVisible(false)}>×</button>
      </div>
      {suggestions.map(s => (
        <div key={s.path} className="link-suggestion-item" onClick={() => insertWikilink(s.name)}>
          <span>📄 {s.name}</span>
          <span className="semantic-score-badge">{Math.round(s.score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
