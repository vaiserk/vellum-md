import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settings.store';
import { useVaultStore } from '../../store/vault.store';
import { AIService } from '../../services/ai.service';
import { X } from 'lucide-react';

export function SettingsModal() {
  const settings = useSettingsStore();
  const { embeddingStatus, indexingProgress, buildEmbeddingIndex } = useVaultStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const provider = settings.getProvider();
  const providers = settings.getAvailableProviders();

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const ok = await AIService.testConnection();
    setTestStatus(ok ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  return (
    <div className="command-palette-overlay" onClick={() => settings.setSettingsOpen(false)}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ Configurações</h3>
          <button onClick={() => settings.setSettingsOpen(false)} className="settings-close">
            <X size={18} />
          </button>
        </div>

        <div className="settings-body">
          {/* Editor Section */}
          <div className="settings-section">
            <h4>Editor</h4>
            
            <div className="settings-row">
              <label>Tamanho da fonte</label>
              <div className="settings-control">
                <input
                  type="range" min="12" max="22" value={settings.fontSize}
                  onChange={e => settings.setFontSize(Number(e.target.value))}
                />
                <span>{settings.fontSize}px</span>
              </div>
            </div>

            <div className="settings-row">
              <label>Tipografia</label>
              <select 
                value={settings.fontFamily}
                onChange={e => settings.setFontFamily(e.target.value)}
              >
                <option value="Inter">Inter (Sans-serif)</option>
                <option value="Lora">Lora (Serif)</option>
                <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                <option value="Roboto">Roboto</option>
              </select>
            </div>

            <div className="settings-row">
              <label>Mostrar números de linha</label>
              <input 
                type="checkbox" checked={settings.showLineNumbers}
                onChange={e => settings.setShowLineNumbers(e.target.checked)}
              />
            </div>

            <div className="settings-row">
              <label>Auto-save delay</label>
              <div className="settings-control">
                <input
                  type="range" min="200" max="2000" step="100" value={settings.autoSaveDelay}
                  onChange={e => settings.setAutoSaveDelay(Number(e.target.value))}
                />
                <span>{settings.autoSaveDelay}ms</span>
              </div>
            </div>
          </div>

          {/* AI Section */}
          <div className="settings-section">
            <h4>Inteligência Artificial</h4>

            <div className="settings-row">
              <label>Provedor</label>
              <select 
                value={settings.aiProvider}
                onChange={e => settings.setAiProvider(e.target.value)}
              >
                {Object.entries(providers).map(([key, p]) => (
                  <option key={key} value={key}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <label>Chave de API</label>
              <div className="settings-control" style={{ flex: 1 }}>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={e => settings.setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="search-input"
                  style={{ marginBottom: 0, flex: 1 }}
                />
                <button onClick={handleTestConnection} style={{ fontSize: '11px', padding: '4px 8px' }}>
                  {testStatus === 'testing' ? '...' : testStatus === 'success' ? '✓ OK' : testStatus === 'error' ? '✕ Falhou' : 'Testar'}
                </button>
              </div>
            </div>

            <div className="settings-row">
              <label>Modelo</label>
              <select 
                value={settings.aiModel}
                onChange={e => settings.setAiModel(e.target.value)}
              >
                {provider.availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Export Section */}
          <div className="settings-section">
            <h4>Exportação</h4>

            <div className="settings-row">
              <label>Formato PDF</label>
              <select
                value={settings.pdfFormat}
                onChange={e => settings.setPdfFormat(e.target.value as any)}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="A5">A5</option>
              </select>
            </div>

            <div className="settings-row">
              <label>Orientação</label>
              <select
                value={settings.pdfOrientation}
                onChange={e => settings.setPdfOrientation(e.target.value as any)}
              >
                <option value="portrait">Retrato</option>
                <option value="landscape">Paisagem</option>
              </select>
            </div>
          </div>

          {/* Semantic Search Section */}
          <div className="settings-section">
            <h4>Busca Semântica</h4>

            <div className="settings-row">
              <label>Provedor de Embedding</label>
              <select
                value={settings.embeddingProvider}
                onChange={e => settings.setEmbeddingProvider(e.target.value as any)}
              >
                {Object.entries(settings.getEmbeddingProviders()).map(([key, p]) => (
                  <option key={key} value={key}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <label>Modelo</label>
              <select
                value={settings.embeddingModel}
                onChange={e => settings.setEmbeddingModel(e.target.value)}
              >
                {settings.getEmbeddingProviders()[settings.embeddingProvider]?.availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <label>Chave de Embedding</label>
              <div className="settings-control" style={{ flex: 1 }}>
                <input
                  type="password"
                  value={settings.embeddingApiKey}
                  onChange={e => settings.setEmbeddingApiKey(e.target.value)}
                  placeholder="Vazio = usa a chave de IA acima"
                  className="search-input"
                  style={{ marginBottom: 0, flex: 1 }}
                />
              </div>
            </div>

            <div className="settings-row">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Sugerir links automaticamente</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                  Sugere wikilinks enquanto você escreve, usando embeddings
                </span>
              </label>
              <input
                type="checkbox"
                checked={settings.suggestConnections}
                onChange={e => settings.setSuggestConnections(e.target.checked)}
              />
            </div>

            <div className="settings-row">
              <label>Status do índice</label>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {embeddingStatus === 'idle' && 'Não indexado'}
                {embeddingStatus === 'indexing' && `Indexando... ${indexingProgress.current}/${indexingProgress.total}`}
                {embeddingStatus === 'ready' && '✓ Pronto'}
                {embeddingStatus === 'error' && '✕ Erro (verifique a chave)'}
              </span>
            </div>

            <div className="settings-row">
              <label />
              <button
                onClick={() => buildEmbeddingIndex()}
                disabled={embeddingStatus === 'indexing'}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                {embeddingStatus === 'indexing' ? 'Indexando...' : 'Reindexar Vault'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
