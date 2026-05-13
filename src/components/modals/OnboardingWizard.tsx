import React, { useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';

type Step = 0 | 1 | 2 | 3;

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [apiKey, setApiKey] = useState('');
  const { setVaultPath, setFiles } = useVaultStore();
  const settings = useSettingsStore();

  const handleSelectVault = async () => {
    const path = await window.electron.fs.openVault();
    if (path) {
      setVaultPath(path);
      const files = await window.electron.fs.readDir(path);
      setFiles(files);
      setStep(2);
    }
  };

  const handleCreateVault = async () => {
    const path = await window.electron.fs.openVault();
    if (path) {
      setVaultPath(path);
      const files = await window.electron.fs.readDir(path);
      setFiles(files);
      // Create a welcome note
      const welcomePath = path + '/Bem-vindo ao VellumMD.md';
      await window.electron.fs.createFile(welcomePath);
      const updatedFiles = await window.electron.fs.readDir(path);
      setFiles(updatedFiles);
      setStep(2);
    }
  };

  const handleSkipAI = () => setStep(3);

  const handleSaveAI = () => {
    if (apiKey.trim()) {
      settings.setApiKey(apiKey);
      settings.setAiEnabled(true);
    }
    setStep(3);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="onboarding-step">
            <div className="onboarding-logo">📜</div>
            <h1>VellumMD</h1>
            <p className="onboarding-tagline">Your second brain, rendered beautifully.</p>
            <p className="onboarding-desc">
              Editor de Markdown desktop-first com suporte a LaTeX, Mermaid, busca semântica via IA e exportação multi-formato.
            </p>
            <button className="onboarding-btn-primary" onClick={() => setStep(1)}>
              Começar →
            </button>
          </div>
        )}

        {/* Step 1: Choose Vault */}
        {step === 1 && (
          <div className="onboarding-step">
            <h2>📂 Escolha seu Vault</h2>
            <p className="onboarding-desc">
              Um <strong>vault</strong> é simplesmente uma pasta no seu computador onde suas notas Markdown serão armazenadas. Sem banco de dados, sem formatos proprietários — apenas arquivos <code>.md</code> puros.
            </p>
            <div className="onboarding-buttons">
              <button className="onboarding-btn-primary" onClick={handleSelectVault}>
                📁 Selecionar pasta existente
              </button>
              <button className="onboarding-btn-secondary" onClick={handleCreateVault}>
                ✨ Criar novo vault
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure AI */}
        {step === 2 && (
          <div className="onboarding-step">
            <h2>🤖 Configure a IA (opcional)</h2>
            <p className="onboarding-desc">
              O VellumMD pode usar IA para busca semântica, sugestões de conexão e assistência na escrita. Isso requer uma chave de API de um provedor como OpenAI, Anthropic, Groq ou Gemini.
            </p>
            <p className="onboarding-note">
              ⚡ A IA é 100% opcional. O editor funciona perfeitamente offline.
            </p>
            <div className="onboarding-input-group">
              <select
                className="onboarding-select"
                value={settings.aiProvider}
                onChange={e => settings.setAiProvider(e.target.value)}
              >
                {Object.entries(settings.getAvailableProviders()).map(([key, p]) => (
                  <option key={key} value={key}>{p.name}</option>
                ))}
              </select>
              <input
                type="password"
                className="onboarding-input"
                placeholder="Cole sua API key aqui..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
            </div>
            <div className="onboarding-buttons">
              <button className="onboarding-btn-primary" onClick={handleSaveAI}>
                {apiKey ? 'Salvar e continuar' : 'Continuar sem IA'}
              </button>
              <button className="onboarding-btn-secondary" onClick={handleSkipAI}>
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="onboarding-logo">🎉</div>
            <h2>Pronto!</h2>
            <p className="onboarding-desc">
              Seu VellumMD está configurado. Aqui está um guia rápido da interface:
            </p>
            <div className="onboarding-tips">
              <div className="onboarding-tip">
                <span className="tip-key">Ctrl+P</span>
                <span>Paleta de comandos</span>
              </div>
              <div className="onboarding-tip">
                <span className="tip-key">Ctrl+\</span>
                <span>Alternar layout (Split/Editor/Preview)</span>
              </div>
              <div className="onboarding-tip">
                <span className="tip-key">Ctrl+Shift+A</span>
                <span>Painel de IA</span>
              </div>
              <div className="onboarding-tip">
                <span className="tip-key">Ctrl+Shift+E</span>
                <span>Exportar PDF</span>
              </div>
              <div className="onboarding-tip">
                <span className="tip-key">/</span>
                <span>Slash commands (início da linha)</span>
              </div>
              <div className="onboarding-tip">
                <span className="tip-key">[[</span>
                <span>Wikilinks entre notas</span>
              </div>
            </div>
            <button className="onboarding-btn-primary" onClick={onComplete}>
              Começar a escrever ✍️
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="onboarding-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`onboarding-dot ${step === i ? 'active' : step > i ? 'done' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
