import { create } from 'zustand';
import { EmbeddingService, extractTags } from '../services/embedding.service';
import { useSettingsStore } from './settings.store';

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
type EmbeddingStatus = 'idle' | 'indexing' | 'ready' | 'error';

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    if (node.children) result.push(...flattenFiles(node.children));
  }
  return result;
}

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

  // Semantic index
  embeddingIndex: Map<string, number[]>;
  tagIndex: Map<string, string[]>;
  embeddingStatus: EmbeddingStatus;
  indexingProgress: { current: number; total: number };


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
  buildEmbeddingIndex: () => Promise<void>;
  loadTagsOnly: () => Promise<void>;
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
  embeddingIndex: new Map(),
  tagIndex: new Map(),
  embeddingStatus: 'idle',
  indexingProgress: { current: 0, total: 0 },
  editorScrollRatio: 0,

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
    aiMessages: typeof updater === 'function' ? updater(state.aiMessages) : updater,
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
          },
        },
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
          },
        },
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

  loadTagsOnly: async () => {
    const { vaultPath, files } = get();
    if (!vaultPath) return;

    const mdFiles = flattenFiles(files).filter(f => f.name.endsWith('.md'));
    const tagIndex = new Map<string, string[]>();

    for (const file of mdFiles) {
      try {
        const content = await window.electron.fs.readFile(file.path);
        const tags = extractTags(content);
        if (tags.length > 0) tagIndex.set(file.path, tags);
      } catch {
        // skip unreadable files
      }
    }

    set({ tagIndex });
  },

  buildEmbeddingIndex: async () => {
    const { vaultPath, files } = get();
    const settings = useSettingsStore.getState();
    const effectiveKey = settings.embeddingApiKey || settings.apiKey;

    if (!vaultPath) return;
    if (!effectiveKey) {
      set({ embeddingStatus: 'error' });
      return;
    }

    set({ embeddingStatus: 'indexing', indexingProgress: { current: 0, total: 0 } });

    try {
      const cache: EmbeddingCache = await window.electron.fs.readEmbeddingCache(vaultPath);
      const entries: Record<string, EmbeddingCacheEntry> = cache.entries ?? {};

      const mdFiles = flattenFiles(files).filter(f => f.name.endsWith('.md'));
      set({ indexingProgress: { current: 0, total: mdFiles.length } });

      const embeddingIndex = new Map<string, number[]>();
      const tagIndex = new Map<string, string[]>();

      for (let i = 0; i < mdFiles.length; i++) {
        const file = mdFiles[i];
        const cached = entries[file.path];

        // Always read content to extract tags
        let content = '';
        try {
          content = await window.electron.fs.readFile(file.path);
        } catch {
          set({ indexingProgress: { current: i + 1, total: mdFiles.length } });
          continue;
        }

        const tags = extractTags(content);
        if (tags.length > 0) tagIndex.set(file.path, tags);

        // Reuse cached embedding if file hasn't changed
        if (cached && cached.mtime === file.mtime) {
          embeddingIndex.set(file.path, cached.embedding);
        } else {
          try {
            const embedding = await EmbeddingService.embed(
              content,
              settings.embeddingProvider,
              settings.embeddingModel,
              effectiveKey
            );
            embeddingIndex.set(file.path, embedding);
            entries[file.path] = { mtime: file.mtime, embedding };
            // Small delay to respect API rate limits
            await new Promise(r => setTimeout(r, 50));
          } catch (e) {
            console.error(`Embedding failed for ${file.name}:`, e);
          }
        }

        set({ indexingProgress: { current: i + 1, total: mdFiles.length } });
      }

      const updatedCache: EmbeddingCache = {
        version: 1,
        provider: settings.embeddingProvider,
        model: settings.embeddingModel,
        entries,
      };
      await window.electron.fs.writeEmbeddingCache(vaultPath, updatedCache);

      set({ embeddingIndex, tagIndex, embeddingStatus: 'ready' });
    } catch (e) {
      console.error('buildEmbeddingIndex error:', e);
      set({ embeddingStatus: 'error' });
    }
  },
}));
