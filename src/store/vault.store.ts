import { create } from 'zustand';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  mtime: number;
  size?: number;
}

type LayoutMode = 'split' | 'editor-only' | 'preview-only';
type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

interface VaultState {
  vaultPath: string | null;
  files: FileNode[];
  activeFile: string | null;
  activeContent: string;
  editorView: any | null;
  theme: 'dark' | 'light';
  layoutMode: LayoutMode;
  saveStatus: SaveStatus;
  cursorPosition: { line: number; col: number };
  typewriterMode: boolean;
  commandPaletteOpen: boolean;
  aiPanelOpen: boolean;
  promptModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
    onCancel: () => void;
  } | null;
  confirmModal: {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
  aiMessages: AIMessage[];
  setVaultPath: (path: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string | null, content?: string) => void;
  setActiveContent: (content: string) => void;
  setEditorView: (view: any | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setCursorPosition: (pos: { line: number; col: number }) => void;
  setTypewriterMode: (on: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setAiPanelOpen: (open: boolean) => void;
  setAiMessages: (updater: AIMessage[] | ((prev: AIMessage[]) => AIMessage[])) => void;
  openPrompt: (title: string, defaultValue: string) => Promise<string | null>;
  closePrompt: () => void;
  openConfirm: (message: string) => Promise<boolean>;
  closeConfirm: () => void;
  cycleLayoutMode: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultPath: null,
  files: [],
  activeFile: null,
  activeContent: '',
  editorView: null,
  theme: 'dark',
  layoutMode: 'split',
  saveStatus: 'idle',
  cursorPosition: { line: 1, col: 1 },
  typewriterMode: false,
  commandPaletteOpen: false,
  aiPanelOpen: false,
  promptModal: null,
  confirmModal: null,
  aiMessages: [],
  setVaultPath: (path) => set({ vaultPath: path }),
  setFiles: (files) => set({ files }),
  setActiveFile: (path, content = '') => set({ activeFile: path, activeContent: content }),
  setActiveContent: (content) => set({ activeContent: content }),
  setEditorView: (view) => set({ editorView: view }),
  setTheme: (theme) => set({ theme }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setTypewriterMode: (on) => set({ typewriterMode: on }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
  setAiMessages: (updater) => set((state) => ({ 
    aiMessages: typeof updater === 'function' ? updater(state.aiMessages) : updater 
  })),
  openPrompt: (title, defaultValue) => {
    return new Promise((resolve) => {
      set({
        promptModal: {
          isOpen: true,
          title,
          defaultValue,
          onConfirm: (val) => {
            resolve(val);
            set({ promptModal: null });
          },
          onCancel: () => {
            resolve(null);
            set({ promptModal: null });
          }
        }
      });
    });
  },
  closePrompt: () => set({ promptModal: null }),
  openConfirm: (message) => {
    return new Promise((resolve) => {
      set({
        confirmModal: {
          isOpen: true,
          message,
          onConfirm: () => {
            resolve(true);
            set({ confirmModal: null });
          },
          onCancel: () => {
            resolve(false);
            set({ confirmModal: null });
          }
        }
      });
    });
  },
  closeConfirm: () => set({ confirmModal: null }),
  cycleLayoutMode: () => {
    const modes: LayoutMode[] = ['split', 'editor-only', 'preview-only'];
    const current = get().layoutMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ layoutMode: next });
  },
}));
