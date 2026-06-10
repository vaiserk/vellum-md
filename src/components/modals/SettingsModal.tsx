import { useState } from 'react';
import { useSettingsStore } from '../../store/settings.store';
import { useVaultStore } from '../../store/vault.store';
import { AIService } from '../../services/ai.service';
import { X, RefreshCw, FlaskConical } from 'lucide-react';

export function SettingsModal() {
  const settings = useSettingsStore();
  const { embeddingStatus, embeddingError, indexingProgress, buildEmbeddingIndex } = useVaultStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [wizardReset, setWizardReset] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [discoveringEmbed, setDiscoveringEmbed] = useState(false);
  const [discoverEmbedError, setDiscoverEmbedError] = useState('');

  const provider = settings.getProvider();
  const providers = settings.getAvailableProviders();
  const isGemmaProvider = settings.aiProvider === 'gemma';
  const isGemmaEmbedding = settings.embeddingProvider === 'gemma';

  // Modelos descobertos — persistidos no store
  const discoveredModels = settings.discoveredAiModels[settings.aiProvider] ?? [];
  const discoveredEmbedModels = settings.discoveredEmbeddingModels[settings.embeddingProvider] ?? [];

  const handleDiscoverEmbedModels = async () => {
    setDiscoveringEmbed(true);
    setDiscoverEmbedError('');
    const filter = isGemmaEmbedding ? 'gemma' : '';

    // Tenta as chaves disponíveis em ordem de preferência:
    // 1. embeddingApiKey (se preenchida e parecer chave Google — começa com 'AIza')
    // 2. apiKey (chave do provedor de IA, usada quando o provedor é Gemma/Google)
    const candidates: string[] = [];
    if (settings.embeddingApiKey?.startsWith('AIza')) candidates.push(settings.embeddingApiKey);
    if (settings.apiKey?.startsWith('AIza')) candidates.push(settings.apiKey);
    // Fallback: tenta qualquer chave preenchida
    if (settings.embeddingApiKey && !candidates.includes(settings.embeddingApiKey)) candidates.push(settings.embeddingApiKey);
    if (settings.apiKey && !candidates.includes(settings.apiKey)) candidates.push(settings.apiKey);

    if (candidates.length === 0) {
      setDiscoverEmbedError('Configure a chave do Google AI Studio (começa com "AIza") no campo "Chave de Embedding" ou na seção de IA acima.');
      setDiscoveringEmbed(false);
      return;
    }

    let lastError = '';
    for (const key of candidates) {
      try {
        const models = await AIService.listGoogleEmbeddingModels(key, filter);
        if (models.length === 0) {
          setDiscoverEmbedError('Nenhum modelo encontrado. Verifique acesso em aistudio.google.com.');
        } else {
          settings.setDiscoveredEmbeddingModels(settings.embeddingProvider, models);
          settings.setEmbeddingModel(models[0].id);
        }
        setDiscoveringEmbed(false);
        return;
      } catch (e: any) {
        lastError = e.message ?? 'Erro desconhecido';
      }
    }
    // Todas as chaves falharam
    setDiscoverEmbedError(`${lastError} — Use a chave do Google AI Studio (aistudio.google.com). Deixe "Chave de Embedding" vazia para usar a mesma chave da seção IA.`);
    setDiscoveringEmbed(false);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const ok = await AIService.testConnection();
    setTestStatus(ok ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  // Busca os IDs exatos de modelos Gemma disponíveis na conta Google AI
  const handleDiscoverModels = async () => {
    setDiscovering(true);
    setDiscoverError('');

    const key = settings.apiKey;
    if (!key?.startsWith('AIza')) {
      setDiscoverError('Use a chave do Google AI Studio (começa com "AIza"). Acesse aistudio.google.com → "Get API key".');
      setDiscovering(false);
      return;
    }
    try {
      const all = await AIService.listGoogleModels(key);
      const gemmaModels = all.filter(m => m.id.toLowerCase().includes('gemma'));
      if (gemmaModels.length === 0) {
        setDiscoverError('Nenhum modelo Gemma encontrado na sua conta. Verifique o acesso em aistudio.google.com.');
      } else {
        settings.setDiscoveredAiModels(settings.aiProvider, gemmaModels);
        settings.setAiModel(gemmaModels[0].id);
      }
    } catch (e: any) {
      setDiscoverError(`${e.message ?? 'Erro ao buscar modelos.'} — Verifique se a chave é do Google AI Studio.`);
    } finally {
      setDiscovering(false);
    }
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
              <div className="settings-control" style={{ flex: 1, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={settings.aiModel}
                    onChange={e => settings.setAiModel(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {/* Modelos descobertos via API têm prioridade */}
                    {discoveredModels.length > 0
                      ? discoveredModels.map(m => (
                          <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>
                        ))
                      : provider.availableModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))
                    }
                  </select>
                  {/* Botão "Descobrir modelos" — aparece apenas para provedor Gemma */}
                  {isGemmaProvider && (
                    <button
                      onClick={handleDiscoverModels}
                      disabled={discovering}
                      title="Buscar modelos disponíveis na sua conta Google AI"
                      style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <RefreshCw size={12} style={{ animation: discovering ? 'spin 1s linear infinite' : 'none' }} />
                      {discovering ? 'Buscando...' : 'Descobrir modelos'}
                    </button>
                  )}
                </div>
                {/* Feedback de erro ou modelos encontrados */}
                {isGemmaProvider && discoverError && (
                  <span style={{ fontSize: '11px', color: 'var(--error-color)' }}>{discoverError}</span>
                )}
                {isGemmaProvider && discoveredModels.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    ✓ {discoveredModels.length} modelo(s) Gemma encontrado(s) na sua conta.
                  </span>
                )}
                {isGemmaProvider && discoveredModels.length === 0 && !discoverError && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Clique em "Descobrir modelos" para buscar os IDs exatos disponíveis na sua conta.
                  </span>
                )}
              </div>
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
              <div className="settings-control" style={{ flex: 1, flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={settings.embeddingModel}
                    onChange={e => settings.setEmbeddingModel(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {discoveredEmbedModels.length > 0
                      ? discoveredEmbedModels.map(m => (
                          <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>
                        ))
                      : settings.getEmbeddingProviders()[settings.embeddingProvider]?.availableModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))
                    }
                  </select>
                  {/* Botão de descoberta — para Gemma e Google (lista modelos com embedContent) */}
                  {(isGemmaEmbedding || settings.embeddingProvider === 'google') && (
                    <button
                      onClick={handleDiscoverEmbedModels}
                      disabled={discoveringEmbed}
                      title="Buscar modelos de embedding disponíveis na sua conta Google AI"
                      style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <RefreshCw size={12} style={{ animation: discoveringEmbed ? 'spin 1s linear infinite' : 'none' }} />
                      {discoveringEmbed ? 'Buscando...' : 'Descobrir modelos'}
                    </button>
                  )}
                </div>
                {discoverEmbedError && (
                  <span style={{ fontSize: '11px', color: 'var(--error-color)' }}>{discoverEmbedError}</span>
                )}
                {discoveredEmbedModels.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    ✓ {discoveredEmbedModels.length} modelo(s) encontrado(s) na sua conta.
                  </span>
                )}
                {isGemmaEmbedding && discoveredEmbedModels.length === 0 && !discoverEmbedError && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Clique em "Descobrir modelos" para buscar os IDs reais disponíveis.
                  </span>
                )}
              </div>
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
                {embeddingStatus === 'error' && (
                  <span style={{ color: 'var(--error-color)', fontSize: '11px' }}>
                    ✕ {embeddingError ?? 'Erro — verifique a chave e o modelo selecionado'}
                  </span>
                )}
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
          {/* Developer Section */}
          <div className="settings-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FlaskConical size={14} />
              Desenvolvedor / Testes
            </h4>

            <div className="settings-row">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Wizard de boas-vindas</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                  Simula um usuário abrindo o app pela primeira vez
                </span>
              </label>
              <button
                onClick={() => {
                  localStorage.removeItem('vellum-onboarding-done');
                  setWizardReset(true);
                  setTimeout(() => setWizardReset(false), 2500);
                  settings.setSettingsOpen(false);
                  // Recarrega a página para o estado inicial ser relido
                  window.location.reload();
                }}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {wizardReset
                  ? '✓ Recarregando...'
                  : <><RefreshCw size={12} /> Resetar wizard</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
