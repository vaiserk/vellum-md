# Atualização de Julho/2026 — Correções críticas, performance e conclusão do planejado

Esta é a maior atualização do VellumMD até o momento. Ela nasceu de uma auditoria
completa do sistema (código, bundle, requisitos do TCC) e ataca, em ordem de
prioridade: **perda de dados**, **velocidade percebida ao digitar**, **tempo de
abertura do app**, **confiabilidade das exportações** e as **últimas promessas do
planejamento ainda não cumpridas** (preview inline no editor, monitoramento em
tempo real do vault e distribuição multiplataforma).

Cada etapa foi implementada, verificada (`tsc --noEmit` + `vite build`) e
commitada isoladamente, para que qualquer regressão possa ser revertida de forma
cirúrgica com `git revert`.

---

## Etapa 0 — Lixeira e manutenção do cache (`ab18e4f`)

**Problema 1:** `deleteFile` criava a lixeira em `subpasta/.vellum/trash` (usava
`path.dirname` do arquivo). Notas deletadas de subpastas nunca apareciam no
"Restaurar última nota" e diretórios `.vellum` ficavam espalhados pelo vault.

**Correção:** a lixeira agora fica sempre em `vault/.vellum/trash`, e o caminho
relativo da nota é codificado no nome do arquivo (separador `__SLASH__`). A
restauração devolve a nota à subpasta original, recriando-a se necessário.
Compatível com itens antigos da lixeira.

**Problema 2:** o `embeddings.json` nunca removia entradas de arquivos
deletados/renomeados — crescia sem limite.

**Correção:** poda de entradas órfãs a cada indexação.

**Bônus:** o cache agora é gravado a cada 10 arquivos embedados. Fechar o app no
meio de uma indexação longa não perde mais o progresso (nem o custo de API já
pago).

**Arquivos:** `electron/handlers/fs.handler.ts`, `electron/preload.ts`,
`src/types/electron.d.ts`, `src/components/sidebar/FileTree.tsx`,
`src/store/vault.store.ts`.

---

## Etapa 1 — Perda de dados ao trocar de nota (auto-save flush)

**Problema:** o auto-save usa *debounce* (padrão 800 ms). Ao trocar de nota, o
efeito de montagem do editor era limpo com `clearTimeout` — **descartando** o
salvamento pendente. Digitar na nota A e clicar na nota B dentro da janela do
debounce perdia as últimas teclas de A, silenciosamente.

**Correção:** o *cleanup* do editor agora faz **flush**: se havia salvamento
pendente, o conteúdo atual do documento é gravado imediatamente antes de o
editor ser destruído. O arquivo de destino é capturado no *closure* do efeito
(não na ref), garantindo que o conteúdo de A nunca seja gravado em B.

**Arquivos:** `src/components/editor/Editor.tsx`.

---

## Etapa 2 — Digitação fluida: seletores granulares, memoização e debounce do preview

Esta é a etapa de maior impacto na velocidade **percebida** do app.

**Problema raiz:** todos os componentes usavam `useVaultStore()` **sem seletor**,
o que significa "assinar a store inteira". Como `activeContent` muda a cada tecla
digitada, **cada tecla re-renderizava o App inteiro** (que é a raiz da árvore
React), a Sidebar, a StatusBar, o AIPanel, o BacklinksPane e todos os modais
sempre montados. O agravante: a Sidebar recomputava `flattenFiles` + busca
léxica sobre **todos os conteúdos do vault no corpo do componente, a cada
render** — digitar custava O(total de caracteres do vault) por tecla.

**Correções aplicadas:**

1. **Seletores granulares com `useShallow`** (`zustand/react/shallow`) em:
   `App`, `Sidebar`, `FileTree`, `BacklinksPane`, `Preview`, `AIPanel`,
   `StatusBar`, `EditorToolbar`, `Editor`, `NewNoteModal`, `PromptModal`,
   `ConfirmModal`. Cada componente agora assina **apenas os campos que usa** —
   digitar não re-renderiza mais nada além do Editor, Preview e StatusBar
   (que precisam do conteúdo por design).

2. **AIPanel não assina mais a nota ativa**: o conteúdo é lido via
   `getState()` apenas no momento do envio da mensagem. Digitar com o painel
   de IA aberto não re-renderiza mais o histórico do chat.

3. **Memoização na Sidebar**: `allFiles`, `lexicalResults`, `unifiedResults`,
   `allTags` e `filesWithTag` agora são `useMemo` — só recomputam quando os
   insumos mudam de fato.

4. **Debounce do preview (200 ms)**: o pipeline unified (markdown→React) não
   re-parseia mais o documento a cada tecla — só após pausa na digitação.
   Trocar de nota atualiza o preview imediatamente (flush por `activeFile`).
   O callback `toggleCheckbox` ganhou identidade estável (lê o estado via
   `getState()`) para não invalidar o memo do conteúdo renderizado.

5. **Editor**: o efeito de sincronização externa não faz mais
   `doc.toString()` + comparação O(n) quando a mudança veio do próprio editor
   (ref `lastFromEditorRef`).

6. **Vault não é mais lido 2× ao indexar**: `loadTagsOnly` virou fallback
   (só roda quando não há chave de embedding) — `buildEmbeddingIndex` já monta
   tags e conteúdos na mesma passada.

7. **Correção de race na busca semântica da Sidebar** (guard de geração):
   duas buscas em voo podiam resolver fora de ordem e exibir resultados da
   query antiga.

8. **Deduplicação**: `flattenFiles` (4 cópias) e `buildKnownNotes` agora vivem
   em `src/utils/files.ts` (fonte única).

**Arquivos:** `src/App.tsx`, `src/components/sidebar/{Sidebar,FileTree,BacklinksPane}.tsx`,
`src/components/preview/Preview.tsx`, `src/components/ai/AIPanel.tsx`,
`src/components/statusbar/StatusBar.tsx`, `src/components/editor/{Editor,EditorToolbar}.tsx`,
`src/components/modals/{NewNoteModal,PromptModal,ConfirmModal}.tsx`,
`src/store/vault.store.ts`, `src/utils/files.ts` (novo),
`src/utils/useDebouncedValue.ts` (novo).

---

*(as demais etapas são documentadas abaixo conforme implementadas)*
