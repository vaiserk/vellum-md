import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
};

interface SettingsState {
  // AI
  aiProvider: string;
  apiKey: string;
  aiModel: string;
  aiEnabled: boolean;
  suggestConnections: boolean;

  // Editor
  fontSize: number;
  editorMaxWidth: number;
  showLineNumbers: boolean;
  autoSaveDelay: number;

  // Export
  pdfFormat: 'A4' | 'Letter' | 'A5';
  pdfOrientation: 'portrait' | 'landscape';

  // UI
  settingsOpen: boolean;

  // Actions
  setAiProvider: (provider: string) => void;
  setApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setAiEnabled: (on: boolean) => void;
  setSuggestConnections: (on: boolean) => void;
  setFontSize: (size: number) => void;
  setEditorMaxWidth: (width: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;
  setPdfFormat: (format: 'A4' | 'Letter' | 'A5') => void;
  setPdfOrientation: (orientation: 'portrait' | 'landscape') => void;
  setSettingsOpen: (open: boolean) => void;

  // Helpers
  getProvider: () => AIProvider;
  getAvailableProviders: () => Record<string, AIProvider>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      aiProvider: 'openai',
      apiKey: '',
      aiModel: 'gpt-4o-mini',
      aiEnabled: false,
      suggestConnections: true,
      fontSize: 16,
      editorMaxWidth: 900,
      showLineNumbers: true,
      autoSaveDelay: 800,
      pdfFormat: 'A4',
      pdfOrientation: 'portrait',
      settingsOpen: false,

      setAiProvider: (provider) => {
        const p = providers[provider];
        set({ aiProvider: provider, aiModel: p?.defaultModel || '' });
      },
      setApiKey: (key) => set({ apiKey: key }),
      setAiModel: (model) => set({ aiModel: model }),
      setAiEnabled: (on) => set({ aiEnabled: on }),
      setSuggestConnections: (on) => set({ suggestConnections: on }),
      setFontSize: (size) => set({ fontSize: size }),
      setEditorMaxWidth: (width) => set({ editorMaxWidth: width }),
      setShowLineNumbers: (show) => set({ showLineNumbers: show }),
      setAutoSaveDelay: (delay) => set({ autoSaveDelay: delay }),
      setPdfFormat: (format) => set({ pdfFormat: format }),
      setPdfOrientation: (orientation) => set({ pdfOrientation: orientation }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      getProvider: () => providers[get().aiProvider] || providers.openai,
      getAvailableProviders: () => providers,
    }),
    {
      name: 'vellum-settings',
      partialize: (state) => ({
        aiProvider: state.aiProvider,
        apiKey: state.apiKey,
        aiModel: state.aiModel,
        aiEnabled: state.aiEnabled,
        suggestConnections: state.suggestConnections,
        fontSize: state.fontSize,
        editorMaxWidth: state.editorMaxWidth,
        showLineNumbers: state.showLineNumbers,
        autoSaveDelay: state.autoSaveDelay,
        pdfFormat: state.pdfFormat,
        pdfOrientation: state.pdfOrientation,
      }),
    }
  )
);
