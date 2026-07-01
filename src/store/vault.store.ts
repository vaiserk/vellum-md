import { create } from 'zustand';
import { EmbeddingService, extractTags, splitIntoPassages, cleanMarkdown } from '../services/embedding.service';
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
  passageIndex: Map<string, { text: string; embedding: number[] }[]>;
  tagIndex: Map<string, string[]>;
  fileContents: Map<string, string>;
  embeddingStatus: EmbeddingStatus;
  embeddingError: string | null;
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
  newNoteModalOpen: boolean;
  setNewNoteModalOpen: (open: boolean) => void;
  lastDeleted: { name: string; path: string } | null;
  setLastDeleted: (info: { name: string; path: string } | null) => void;
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
  newNoteModalOpen: false,
  lastDeleted: null,
  embeddingIndex: new Map(),
  passageIndex: new Map(),
  tagIndex: new Map(),
  fileContents: new Map(),
  embeddingStatus: 'idle',
  embeddingError: null,
  indexingProgress: { current: 0, total: 0 },

  setNewNoteModalOpen: (open) => set({ newNoteModalOpen: open }),
  setLastDeleted: (info) => set({ lastDeleted: info }),
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
    const fileContents = new Map<string, string>();

    for (const file of mdFiles) {
      try {
        const content = await window.electron.fs.readFile(file.path);
        fileContents.set(file.path, content);
        const tags = extractTags(content);
        if (tags.length > 0) tagIndex.set(file.path, tags);
      } catch {
        // skip unreadable files
      }
    }

    set({ tagIndex, fileContents });
  },

  buildEmbeddingIndex: async () => {
    const { vaultPath, files, embeddingStatus } = get();
    const settings = useSettingsStore.getState();
    const effectiveKey = settings.getEmbeddingKey();

    if (!vaultPath) return;
    if (!effectiveKey) {
      set({ embeddingStatus: 'error' });
      return;
    }
    // Evita execuções concorrentes: criar/renomear arquivos durante uma indexação em
    // andamento dispara um novo buildEmbeddingIndex, e duas execuções em paralelo
    // disputariam a escrita do cache e dos índices em memória.
    if (embeddingStatus === 'indexing') return;

    set({ embeddingStatus: 'indexing', embeddingError: null, indexingProgress: { current: 0, total: 0 } });

    try {
      const cache: EmbeddingCache = await window.electron.fs.readEmbeddingCache(vaultPath);
      // Embeddings de modelos/provedores diferentes vivem em espaços vetoriais distintos —
      // misturá-los na mesma busca produz similaridades sem sentido (relevância baixa/aleatória).
      // Se o provedor/modelo configurado mudou desde a última indexação, descarta o cache
      // inteiro e reembeda tudo do zero com o modelo atual.
      const cacheMatchesCurrentModel =
        cache.provider === settings.embeddingProvider && cache.model === settings.embeddingModel;
      const entries: Record<string, EmbeddingCacheEntry> = cacheMatchesCurrentModel ? (cache.entries ?? {}) : {};

      const mdFiles = flattenFiles(files).filter(f => f.name.endsWith('.md'));
      set({ indexingProgress: { current: 0, total: mdFiles.length } });

      const embeddingIndex = new Map<string, number[]>();
      const passageIndex = new Map<string, { text: string; embedding: number[] }[]>();
      const tagIndex = new Map<string, string[]>();
      const fileContents = new Map<string, string>();

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

        fileContents.set(file.path, content);
        const tags = extractTags(content);
        if (tags.length > 0) tagIndex.set(file.path, tags);

        // Reuse cached embedding + passages if file hasn't changed and passages are stored
        if (cached && cached.mtime === file.mtime && cached.passages) {
          embeddingIndex.set(file.path, cached.embedding);
          passageIndex.set(file.path, cached.passages);
        } else {
          try {
            // Estratégia batch: documento inteiro + todas as passagens do arquivo
            // em UMA requisição (batchEmbedContents). Um arquivo com N passagens
            // custa 1 chamada em vez de N+1 — essencial para caber nos 100 RPM
            // do free tier e reduzir o tempo de indexação em ~10x.
            const cleanedDoc = cleanMarkdown(content);
            if (!cleanedDoc) {
              // Arquivo sem texto útil (só código/frontmatter) — não indexa
              set({ indexingProgress: { current: i + 1, total: mdFiles.length } });
              continue;
            }
            const rawPassages = splitIntoPassages(content);
            const embeddings = await EmbeddingService.embedBatch(
              [cleanedDoc, ...rawPassages],
              settings.embeddingProvider,
              settings.embeddingModel,
              effectiveKey
            );

            const embedding = embeddings[0];
            const embeddedPassages = rawPassages.map((text, p) => ({
              text,
              embedding: embeddings[p + 1],
            }));

            embeddingIndex.set(file.path, embedding);
            passageIndex.set(file.path, embeddedPassages);
            entries[file.path] = { mtime: file.mtime, embedding, passages: embeddedPassages };
          } catch (e: any) {
            const msg: string = e?.message ?? String(e);
            console.error(`Embedding failed for ${file.name}:`, msg);
            // Erros sistêmicos abortam a indexação — não adianta continuar arquivo a arquivo
            const isAuthError = msg.includes('API_KEY_INVALID') || msg.includes('401') ||
              (msg.includes('400') && msg.includes('API key'));
            const isModelError = msg.includes('404') || msg.toLowerCase().includes('not found');
            if (isAuthError || isModelError) {
              set({
                embeddingStatus: 'error',
                embeddingError: isAuthError
                  ? 'Chave de API inválida. Verifique as Configurações.'
                  : `Modelo de embedding "${settings.embeddingModel}" indisponível. Selecione outro nas Configurações.`,
                embeddingIndex, passageIndex, tagIndex, fileContents,
                indexingProgress: { current: i + 1, total: mdFiles.length },
              });
              return;
            }
            // 429 e outros erros transitórios: pula o arquivo e continua
            // (o embedding service já tentou 3x com backoff antes de lançar)
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

      set({ embeddingIndex, passageIndex, tagIndex, fileContents, embeddingStatus: 'ready' });
    } catch (e) {
      console.error('buildEmbeddingIndex error:', e);
      set({ embeddingStatus: 'error' });
    }
  },
}));
