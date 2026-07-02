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

## Etapa 3 — Abertura mais rápida: lazy-load do Mermaid

**Problema:** `import mermaid from 'mermaid'` estático no Preview colocava o
core do Mermaid dentro do chunk principal do app. Resultado: **2.048 kB**
(608 kB gzip) carregados e avaliados na abertura, mesmo para quem nunca usa
diagramas.

**Correção:** o Mermaid agora é importado dinamicamente (`import('mermaid')`)
na primeira vez que um bloco ` ```mermaid ` precisa ser renderizado. As regras
de segurança do design anterior foram preservadas: `initialize()` nunca roda
durante um render em andamento, e o tema é sincronizado por MutationObserver.
Um skeleton "Renderizando diagrama…" cobre o intervalo de carregamento.

**Resultado medido no build:**

| Chunk | Antes | Depois |
|---|---|---|
| `index` (principal) | 2.048 kB (609 kB gzip) | **1.438 kB (461 kB gzip)** |
| `mermaid.core` | — (embutido) | 610 kB, carregado **sob demanda** |

**Arquivos:** `src/components/preview/Preview.tsx`.

---

## Etapa 4 — Exportações offline, PDF determinístico e escape de títulos

**Problema 1 (offline):** PDF, slides e site carregavam KaTeX, highlight.js,
Mermaid, Reveal.js e fontes de **CDNs**. Sem internet, o PDF saía sem fórmulas
e sem diagramas — contradizendo o requisito do projeto de renderização local.

**Correção:** todos os assets agora vêm das dependências locais
(`require.resolve` + leitura do arquivo — funciona em dev e dentro do asar no
app empacotado):
- **PDF**: KaTeX (CSS + fontes woff2 em data URIs), highlight.js e Mermaid
  **inline** no HTML; fontes do sistema (Georgia) no lugar do Google Fonts.
  O HTML passa de 2 MB com o Mermaid inline, então a página é carregada por
  arquivo temporário (`loadFile`) em vez de data URL (limite do Chromium).
- **Slides**: `reveal.js` virou dependência local; o HTML exportado é
  **autocontido** (reveal + katex + highlight + mermaid inline) e abre offline
  em qualquer máquina. Whitelist de temas evita path traversal.
- **Site estático**: pasta `assets/` (katex.min.css + fontes, github.min.css,
  mermaid.min.js) copiada junto ao site; páginas referenciam relativamente.

**Problema 2 (PDF lento/incompleto):** espera fixa de 3,5 s pela renderização —
lenta para notas simples e insuficiente para notas cheias de diagramas.

**Correção:** o HTML define `window.__renderReady`, uma promise que resolve
quando `mermaid.run()` termina **e** `document.fonts.ready` resolve. O processo
principal aguarda esse sinal (teto de 15 s) antes do `printToPDF`.

**Problema 3:** títulos de notas injetados sem escape no HTML exportado —
nota com `<` ou `&` no nome quebrava a página.

**Correção:** `escapeHtml()` em títulos, navegação e `<title>`.

**Arquivos:** `electron/handlers/export.handler.ts`, `package.json` (+ `reveal.js`).

---

## Etapa 5 — Embeddings com 768 dimensões (cache e busca 4× mais leves)

**Problema:** `gemini-embedding-001` retorna vetores de **3072 dimensões** por
padrão. Cada nota indexada (documento + ~10 passagens) custava ~34 mil números
no `embeddings.json` — em vaults médios o cache chegava a dezenas de MB, com
parse lento na abertura e similaridade de cosseno proporcionalmente cara.

**Correção:** todas as requisições de embedding agora pedem
`outputDimensionality: 768` (truncamento MRL, suportado nativamente pela API
Google; a OpenAI aceita o equivalente `dimensions`). A constante única
`EMBEDDING_DIMENSIONS` em `embedding.service.ts` governa o valor.

**Invalidação de cache:** vetores de 768 e 3072 dims habitam espaços vetoriais
diferentes — misturá-los quebraria a busca silenciosamente. O cache agora
registra `dimensions`, e o `vault.store` descarta caches com dimensão diferente
da atual (caches antigos, sem o campo, são reindexados integralmente na
primeira abertura — comportamento esperado e único custo da migração).

**Resultado:** cache em disco, memória e tempo de similaridade ~4× menores,
com perda de qualidade de recuperação negligível (propriedade do treinamento
Matryoshka do modelo).

**Arquivos:** `src/services/embedding.service.ts`, `src/store/vault.store.ts`,
`src/types/electron.d.ts`.

---

## Etapa 6 — Preview inline de LaTeX e Mermaid no editor (feature planejada, religada)

**Contexto:** as extensões `latexInlinePreview` e `mermaidInlinePreview`
existiam desde o início do projeto — mas **nunca foram adicionadas ao array
`extensions` do editor**. A promessa do TCC de renderizar fórmulas e diagramas
"diretamente no editor" estava com o código pronto e desligado.

**O que foi feito antes de religar:**

1. **`mermaid.ext.ts` reescrito para `visibleRanges`**: a versão original fazia
   `doc.toString()` + regex no documento inteiro a cada tecla — religá-la assim
   traria lag em notas grandes. Agora escaneia apenas os trechos visíveis
   (mesma técnica já aplicada ao `latex.ext.ts`).

2. **Loader do Mermaid compartilhado** (`src/utils/mermaid-loader.ts`): o
   Preview e a extensão do editor usam a **mesma instância lazy e a mesma fila
   de renderização**. Sem isso, dois `initialize()` concorrentes e renders em
   paralelo (editor + preview no modo split) corromperiam o singleton do
   Mermaid com erros de sintaxe espúrios. O lazy-load da Etapa 3 é preservado.

3. Widget do editor ganhou estado de carregamento ("Renderizando diagrama…").

**Comportamento:** fórmulas `$...$`/`$$...$$` e blocos ` ```mermaid ` renderizam
no lugar do código quando o cursor está fora deles; clicar/mover o cursor para
dentro devolve o código-fonte editável. O CSS dos widgets já existia em
`index.css`.

**Arquivos:** `src/utils/mermaid-loader.ts` (novo),
`src/components/editor/extensions/mermaid.ext.ts`,
`src/components/preview/Preview.tsx`, `src/components/editor/Editor.tsx`.

---

## Etapa 7 — Monitoramento em tempo real do vault (file watcher)

**Contexto:** os objetivos específicos do TCC prometem "monitoramento em tempo
real de alterações" no vault — era a última funcionalidade planejada sem
nenhuma implementação. Mudanças externas (outro editor, sync de nuvem) só
apareciam reabrindo o vault.

**Implementação:**
- `fs.watch(vaultPath, { recursive: true })` no processo principal
  (`fs:watchVault` / `fs:unwatchVault`), com notificação ao renderer via
  evento `vault:changed`.
- **Filtro de `.vellum/`**: sem ele, gravar o cache de embeddings dispararia o
  próprio watcher e criaria um loop de reindexação. Extensões fora da lista do
  app também são ignoradas.
- **Debounce de 1,5 s** no processo principal: rajadas de eventos (salvar,
  sync de vários arquivos) viram uma única notificação.
- No `App`, a notificação refaz o `readDir` e chama `setFiles` — que dispara a
  reindexação **incremental**: pelo cache por `mtime`, só arquivos realmente
  modificados custam chamadas de API. Efeito colateral aceito e desejado: a
  nota em edição é re-embedada após cada rajada de salvamentos, mantendo o
  índice semântico sempre atualizado (1 requisição batch por rajada; o rate
  limiter protege a cota).
- Watcher fechado e re-aberto ao trocar de vault (cleanup do efeito).

**Arquivos:** `electron/handlers/fs.handler.ts`, `electron/preload.ts`,
`src/types/electron.d.ts`, `src/App.tsx`.

---

## Pendências (próximas etapas planejadas, ainda não implementadas)

- **Etapa 8:** configuração do `electron-builder` (appId, targets, ícone) para
  gerar instaladores de verdade — fase 5 do plano do TCC.
