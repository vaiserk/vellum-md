# VellumMD — Registro de Mudanças

## Sessão atual (audit completo + refatoração visual)

### Bug Fixes

#### Onboarding infinito (App.tsx)
- `useState` inicializava com `localStorage.removeItem(...)`, apagando o flag toda vez
- Corrigido para `!localStorage.getItem('vellum-onboarding-done')`

#### `rehypeHighlight` com argumento inválido (Preview.tsx, ExportModal.tsx, SlideEditorModal.tsx)
- `.use(rehypeHighlight, { ignoreMissing: true })` e `.use(rehypeHighlight, true)` causavam erros de tipo
- Substituído por `.use(rehypeHighlight)` (comportamento padrão já ignora linguagens desconhecidas)

#### Backlinks re-lendo arquivos via IPC a cada mudança (BacklinksPane.tsx)
- Substituído loop `async readFile` por `useMemo` lendo o cache `fileContents` do store
- Resultados sincronos, zero chamadas IPC adicionais

---

### Novas Funcionalidades

#### Compartment para `showLineNumbers` (Editor.tsx)
- Linha Numbers agora usa CM6 `Compartment`, permitindo toggle reativo sem recriar o editor
- `useEffect([showLineNumbers])` reconfigura o compartment quando a configuração muda

#### `autoSaveDelay` reativo via ref (Editor.tsx)
- `autoSaveDelayRef` é atualizado em cada render; o closure do `setTimeout` sempre lê `ref.current`
- Muda de 800ms hardcoded para o valor persistido em `settings.store`

#### Sincronização de conteúdo externo no Editor (Editor.tsx)
- `useEffect([activeContent])` detecta quando o documento CM6 diverge do store
- Dispara transaction de substituição apenas quando necessário (sem loop infinito)
- Habilita que alterações do Preview (ex: toggle de checkbox) atualizem o editor

#### Markdown renderizado no AI Panel (AIPanel.tsx)
- Mensagens do assistente exibiam texto cru (ex: `**bold**` literalmente)
- Adicionado componente `MarkdownContent` usando unified + remark-gfm + rehype-highlight + rehype-react
- CSS `.ai-markdown` adicionado em `index.css` com estilos para código, tabelas, headings, listas

#### `fileContents` populado em `buildEmbeddingIndex` (vault.store.ts)
- A função já lia o conteúdo dos arquivos para embeddings mas não salvava no cache `fileContents`
- Adicionada declaração `const fileContents = new Map<string, string>()` antes do loop
- `fileContents.set(file.path, content)` adicionado dentro do loop
- `fileContents` incluído no `set()` final junto com `embeddingIndex`, `passageIndex`, `tagIndex`

#### Nova Nota via modal dedicado (CommandPalette.tsx)
- Comando `new-note` usava `openPrompt` (prompt inline) para pedir o nome do arquivo
- Substituído por `setNewNoteModalOpen(true)` que abre o `NewNoteModal` dedicado

---

### Refatoração Visual e CSS (index.css)

#### Eliminação de `!important`
- Regra global `button` forçava a cor `--accent` em todos os botões; overrides precisavam de `!important`
- Substituído por seletores compostos (`button.class-name`) que têm especificidade maior sem `!important`
- Afetados: `btn-ghost`, `btn-secondary`, `settings-close`, `ai-close`, `export-tab`, `ai-quick-btn`, `ai-insert-btn`, `slide-nav-btn`, `slide-dot`, `slide-insert-sep-btn`, `slide-editor-close`

#### Variável CSS `--bg-secondary` inexistente
- Context menu em FileTree usava `var(--bg-secondary)` que não estava no design system
- Substituído por classe CSS `.context-menu` usando `var(--editor-bg)` + sombra definida

#### Callouts CAUTION vs DANGER (preview.css + index.css)
- Ambos usavam a mesma cor vermelha `#f85149`
- CAUTION corrigido para âmbar `#e3a14f` em ambos os arquivos

#### Novos estilos adicionados
- `.context-menu`, `.context-menu-item`, `.context-menu-item--danger` com hover states
- `button.btn-ghost`, `button.btn-secondary` como variantes semânticas
- Focus rings: `button:focus-visible`, `input:focus-visible`, `textarea:focus-visible`, `select:focus-visible`
- Scrollbar customizada: 6px, track transparente, thumb `--border-color`, hover `--text-secondary`
- Editor max-width via `--editor-max-width` no `.cm-editor .cm-content`

---

### Correções TypeScript

#### Imports `React` não utilizados removidos
- `App.tsx`, `OnboardingWizard.tsx`, `SettingsModal.tsx`, `Sidebar.tsx`, `ExportModal.tsx`, `SlideEditorModal.tsx`, `BacklinksPane.tsx`, `Editor.tsx`, `AIPanel.tsx`
- Migrados para imports nomeados (`{ useState }`, `{ MouseEvent }`, etc.)

#### FileTree.tsx
- `setActiveContent` não utilizado removido do destructuring
- `files` não utilizado removido do `useVaultStore.getState()` dentro de `handleRename`
- `import React` + `React.useState` / `React.useEffect` substituídos por named imports

---

### IPC Electron (sessão anterior)

#### `shell:openExternal` via IPC
- `electron/handlers/fs.handler.ts`: `ipcMain.handle('shell:openExternal', ...)` adicionado
- `electron/preload.ts`: `shell.openExternal` exposto via contextBridge
- `src/types/electron.d.ts`: interface `Window.electron.shell` adicionada
