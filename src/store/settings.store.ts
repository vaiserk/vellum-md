import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EmbeddingProviderKey, embeddingProviders } from '../services/embedding.service';

export interface AIProvider {
  name: string;
  baseUrl: string;
  defaultModel: string;
  availableModels: string[];
}

const providers: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    availableModels: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022'],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant',
    availableModels: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  },
  gemini: {
    name: 'Gemini (Google)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'],
  },
  // Gemma via Google AI native API (generateContent) — mesma chave do AI Studio / Gemini.
  gemma: {
    name: 'Gemma (Google)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemma-4-31b-it',
    availableModels: [
      // ── Gemma 4 (IDs confirmados via API) ──
      'gemma-4-31b-it',        // Gemma 4 31B IT — denso
      'gemma-4-26b-a4b-it',    // Gemma 4 26B A4B IT — MoE (eficiente)
      // ── Gemma 3 (IDs confirmados) ──
      'gemma-3-27b-it',
      'gemma-3-12b-it',
      'gemma-3-4b-it',
      'gemma-3-1b-it',
      'gemma-3n-e4b-it',
      'gemma-3n-e2b-it',
    ],
  },
};

interface SettingsState {
  // AI
  aiProvider: string;
  apiKey: string;
  aiModel: string;
  aiEnabled: boolean;
  suggestConnections: boolean;

  // Embedding
  embeddingProvider: EmbeddingProviderKey;
  embeddingModel: string;
  embeddingApiKey: string;

  // Editor
  fontSize: number;
  fontFamily: string;
  editorMaxWidth: number;
  showLineNumbers: boolean;
  autoSaveDelay: number;

  // Export
  pdfFormat: 'A4' | 'Letter' | 'A5';
  pdfOrientation: 'portrait' | 'landscape';

  // UI
  settingsOpen: boolean;

  // Modelos descobertos via "Descobrir modelos" — persistidos por provedor
  discoveredAiModels: Record<string, { id: string; displayName: string }[]>;
  discoveredEmbeddingModels: Record<string, { id: string; displayName: string }[]>;

  // Actions
  setAiProvider: (provider: string) => void;
  setApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setAiEnabled: (on: boolean) => void;
  setSuggestConnections: (on: boolean) => void;
  setDiscoveredAiModels: (provider: string, models: { id: string; displayName: string }[]) => void;
  setDiscoveredEmbeddingModels: (provider: string, models: { id: string; displayName: string }[]) => void;
  setEmbeddingProvider: (provider: EmbeddingProviderKey) => void;
  setEmbeddingModel: (model: string) => void;
  setEmbeddingApiKey: (key: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setEditorMaxWidth: (width: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;
  setPdfFormat: (format: 'A4' | 'Letter' | 'A5') => void;
  setPdfOrientation: (orientation: 'portrait' | 'landscape') => void;
  setSettingsOpen: (open: boolean) => void;

  // Helpers
  getProvider: () => AIProvider;
  getAvailableProviders: () => Record<string, AIProvider>;
  getEmbeddingProviders: () => typeof embeddingProviders;
  /** Resolve a melhor chave para embedding (evita usar chave inválida/antiga). */
  getEmbeddingKey: () => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      aiProvider: 'openai',
      apiKey: '',
      aiModel: 'gpt-4o-mini',
      aiEnabled: false,
      suggestConnections: true,
      discoveredAiModels: {},
      discoveredEmbeddingModels: {},
      embeddingProvider: 'google',
      embeddingModel: 'gemini-embedding-2-preview',
      embeddingApiKey: '',
      fontSize: 16,
      fontFamily: 'Inter',
      editorMaxWidth: 900,
      showLineNumbers: true,
      autoSaveDelay: 800,
      pdfFormat: 'A4',
      pdfOrientation: 'portrait',
      settingsOpen: false,

      setAiProvider: (provider) => {
        const p = providers[provider];
        // Ao trocar provedor, usa o modelo descoberto mais recente (se houver) ou o default
        const discovered = get().discoveredAiModels[provider];
        const model = discovered?.length ? discovered[0].id : (p?.defaultModel || '');
        set({ aiProvider: provider, aiModel: model });
      },
      setDiscoveredAiModels: (provider, models) =>
        set(state => ({
          discoveredAiModels: { ...state.discoveredAiModels, [provider]: models },
          ...(state.aiProvider === provider && models.length > 0 && !models.find(m => m.id === state.aiModel)
            ? { aiModel: models[0].id }
            : {}),
        })),
      setDiscoveredEmbeddingModels: (provider, models) =>
        set(state => ({
          discoveredEmbeddingModels: { ...state.discoveredEmbeddingModels, [provider]: models },
          ...(state.embeddingProvider === provider && models.length > 0 && !models.find(m => m.id === state.embeddingModel)
            ? { embeddingModel: models[0].id }
            : {}),
        })),
      setApiKey: (key) => set({ apiKey: key }),
      setAiModel: (model) => set({ aiModel: model }),
      setAiEnabled: (on) => set({ aiEnabled: on }),
      setSuggestConnections: (on) => set({ suggestConnections: on }),
      setEmbeddingProvider: (provider) => {
        const p = embeddingProviders[provider];
        set({ embeddingProvider: provider, embeddingModel: p?.defaultModel || '' });
      },
      setEmbeddingModel: (model) => set({ embeddingModel: model }),
      setEmbeddingApiKey: (key) => set({ embeddingApiKey: key }),
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (font) => set({ fontFamily: font }),
      setEditorMaxWidth: (width) => set({ editorMaxWidth: width }),
      setShowLineNumbers: (show) => set({ showLineNumbers: show }),
      setAutoSaveDelay: (delay) => set({ autoSaveDelay: delay }),
      setPdfFormat: (format) => set({ pdfFormat: format }),
      setPdfOrientation: (orientation) => set({ pdfOrientation: orientation }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      getProvider: () => providers[get().aiProvider] || providers.openai,
      getAvailableProviders: () => providers,
      getEmbeddingProviders: () => embeddingProviders,
      getEmbeddingKey: () => {
        const { embeddingProvider, embeddingApiKey, apiKey } = get();
        // Para Google/Gemma, chaves válidas começam com "AIza".
        // Se o campo de embedding tiver lixo/chave antiga, cai para a chave de IA válida.
        if (embeddingProvider === 'google' || embeddingProvider === 'gemma') {
          if (embeddingApiKey.startsWith('AIza')) return embeddingApiKey;
          if (apiKey.startsWith('AIza')) return apiKey;
          return embeddingApiKey || apiKey;
        }
        return embeddingApiKey || apiKey;
      },
    }),
    {
      name: 'vellum-settings',
      partialize: (state) => ({
        aiProvider: state.aiProvider,
        apiKey: state.apiKey,
        aiModel: state.aiModel,
        aiEnabled: state.aiEnabled,
        suggestConnections: state.suggestConnections,
        discoveredAiModels: state.discoveredAiModels,
        discoveredEmbeddingModels: state.discoveredEmbeddingModels,
        embeddingProvider: state.embeddingProvider,
        embeddingModel: state.embeddingModel,
        embeddingApiKey: state.embeddingApiKey,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        editorMaxWidth: state.editorMaxWidth,
        showLineNumbers: state.showLineNumbers,
        autoSaveDelay: state.autoSaveDelay,
        pdfFormat: state.pdfFormat,
        pdfOrientation: state.pdfOrientation,
      }),
    }
  )
);
