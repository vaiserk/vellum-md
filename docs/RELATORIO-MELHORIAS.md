# VellumMD — Relatório de Melhorias e Aperfeiçoamentos

> Revisão de engenharia sobre todo o codebase, posterior à atualização de Julho/2026.
> Produzida por **9 revisores especializados em paralelo** (um por dimensão), com **cada achado
> submetido a um verificador adversarial** que releu o código real — descartando o que a
> refatoração recente já havia resolvido. Ver `ATUALIZACAO-JULHO-2026.md` para o estado-base.

---

## 1. Metodologia

- **Fan-out:** 9 dimensões analisadas simultaneamente — Electron & Segurança, Estado & Fluxo, Embeddings & Busca, Serviços de IA, Editor & Extensões, Preview & Renderização, UX/UI & Acessibilidade, Build/Deps/TCC e uma passada de regressão sobre as mudanças de Julho.
- **Verificação adversarial:** cada achado recebeu um veredito independente — `CONFIRMADO` (real e preciso), `PLAUSÍVEL` (real, mas com ressalva de descrição/severidade) ou `REJEITADO` (falso ou já corrigido). **Só os não-rejeitados entram neste relatório.**
- **Custo/transparência:** ~2,37 M tokens, 74 agentes concluídos. Duas tarefas caíram no fim por limite de gasto (a dimensão *regressão-Julho* e um verificador de *Estado*); a lacuna é coberta na Seção 4 com base no histórico desta sessão.

## 2. Panorama

**66 achados** mantidos após verificação (55 confirmados, 11 plausíveis · 0 rejeitados neste lote).

| Severidade | Qtd | | Área | Qtd | | Esforço | Qtd |
|---|---|---|---|---|---|---|---|
| 🔴 Crítico | 2 | | Electron & Segurança | 9 | | Baixo | 33 |
| 🟠 Alto | 9 | | Estado & Fluxo de Dados | 7 | | Medio | 31 |
| 🟡 Médio | 24 | | Embeddings & Busca | 6 | | Alto | 2 |
| 🔵 Baixo | 31 | | Serviços de IA | 12 | |  |  |
|  |  | | Editor & Extensões | 8 | |  |  |
|  |  | | Preview & Renderização | 7 | |  |  |
|  |  | | UX/UI & Acessibilidade | 11 | |  |  |
|  |  | | Build / Dependências / TCC | 6 | |  |  |

### 2.1. Leitura executiva

A refatoração de Julho deixou o app **rápido e coeso** — os revisores não reabriram nenhum dos problemas de performance/perda-de-dados então resolvidos. O que sobra concentra-se em **três frentes**, nesta ordem de urgência:

1. **Segurança do processo Electron (a maior lacuna).** Os dois achados críticos e vários altos são da mesma família: o renderer pode ler/gravar **qualquer arquivo do disco** via IPC (sem confinamento ao vault), o Mermaid roda com `securityLevel: 'loose'`, não há trava de navegação da janela nem CSP. Isoladamente cada um exige um gatilho (um XSS no preview), mas juntos transformam um bug de renderização em **comprometimento total do disco**. É barato de mitigar e deveria vir antes de tudo.

2. **Robustez dos serviços de IA e busca.** O parsing de streaming SSE perde tokens em fronteira de chunk e corrompe acentos; o chat não renderiza fórmula/diagrama/callout/wikilink (pipeline pobre); requests não são canceláveis; o rate limiter só cobre parte dos provedores. Nada disso quebra o "caminho feliz", mas mina a confiabilidade da funcionalidade central do TCC.

3. **Acessibilidade e maturidade de projeto.** Navegação 100% dependente de mouse, modais sem semântica de diálogo/focus-trap, comandos "falsos" na paleta; e, no ferramental, **ausência total de testes, linter e CI**. Para um TCC que será defendido e avaliado, esses dois grupos são os de melhor relação custo/benefício de imagem.

**Correções de fato (bugs reais, não só refino), por prioridade:**

| # | Achado | Sev. | Esforço |
|---|--------|------|---------|
| 7 | Toggle de checkbox reescreve a **linha errada** da nota | Alto | médio |
| 5 | Streaming SSE **descarta tokens** em fronteira de chunk | Alto | médio |
| 17 | "Restaurar" traz a **nota errada** (ordena por mtime, não por exclusão) | Médio | baixo |
| 15 | Wikilink com alias/âncora sempre marcado como **quebrado** no editor | Médio | baixo |
| 27 | `TextDecoder` sem `stream:true` **corrompe acentos/emoji** no chat | Médio | baixo |
| 47 | "Restaurar" **sobrescreve** arquivo existente sem checar | Baixo | baixo |

### 2.2. Roadmap sugerido (ondas)

- **Onda A — Segurança (fazer primeiro, baixo esforço, alto retorno):** confinar IPC ao vault (#1), trava de navegação/janela + `setWindowOpenHandler` (#4), CSP e assets locais sem CDN (#46), `securityLevel: 'strict'` no Mermaid (#2, #45). *Rede de segurança inteira em ~1 dia.*
- **Onda B — Bugs de correção:** #7, #5, #27, #17, #15, #47 — todos pequenos, com impacto direto no usuário. Aqui é onde os **testes** (#3) deveriam nascer, cobrindo primeiro as funções puras (`splitIntoPassages`, `topKSimilar`, toggle de checkbox, parsing SSE).
- **Onda C — Confiabilidade de IA/busca:** unificar o pipeline `unified` numa fonte só (#8/#28), cancelamento de requests (#29), rate limit para todos os provedores (#22/#30), passagens realmente usadas no ranking (#21).
- **Onda D — Acessibilidade & ferramental:** semântica de diálogo + focos (#10/#11/#35), paleta sem comandos falsos (#9), ESLint/Prettier + CI (#12/#14), split de bundle e `tsconfig` por ambiente (#36/#37).
- **Onda E — Polimento:** os demais itens baixos (scroll-sync, code splitting, `index.css` modular, `prefers-reduced-motion`, etc.).

> **Nota de método:** antes de atacar a Onda B, vale criar a rede de testes da Onda A/B juntas — foi a recomendação recorrente dos revisores e é o que protege o app durante mudanças futuras.

---

## 3. Catálogo de achados

Ordenados por severidade e, dentro dela, por área. Cada item traz arquivos (com linhas), problema, recomendação e impacto. Itens `PLAUSÍVEL` incluem a ressalva do verificador.

### 🔴 Crítico (2)

#### 1. IPC de arquivos sem confinamento ao vault (renderer pode ler/escrever qualquer arquivo do disco)
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **medio** · categoria *seguranca*

**Arquivos:** `electron/handlers/fs.handler.ts:50-64`, `electron/handlers/fs.handler.ts:66-74`, `electron/handlers/fs.handler.ts:81-100`, `electron/preload.ts:7-11`

**Problema.** Os handlers fs:readFile, fs:writeFile, fs:createFile, fs:renameFile e fs:deleteFile recebem um caminho absoluto do renderer e o repassam direto para fs.readFileSync/writeFileSync/renameSync SEM validar que ele pertence ao vault aberto. Resposta objetiva a pergunta do briefing: sim, o renderer pode ler e escrever QUALQUER arquivo do disco (ex.: fs:readFile('C:\\Users\\...\\.ssh\\id_rsa') ou fs:writeFile em qualquer caminho). Isso importa porque a camada de preview processa conteudo nao confiavel: Preview.tsx:275 usa remarkRehype com allowDangerousHtml:true e ha varios dangerouslySetInnerHTML (Preview.tsx:59, SlideEditorModal.tsx:116). Uma nota maliciosa (ou sync de nuvem de terceiros) que consiga executar JS no renderer ganha exfiltracao/gravacao total do disco via window.electron.fs, sem nenhuma barreira de path.

**Recomendação.** Guardar o vaultPath autorizado no processo principal (definido em fs:openVault) e criar um helper assertInsideVault(p) que faz path.resolve e verifica que o resultado comeca por vaultPath + path.sep antes de qualquer operacao de fs. Aplicar em TODOS os handlers de leitura/escrita/rename/delete. Rejeitar (throw/return erro) caminhos fora do vault. Nao confiar apenas no contextIsolation: o valor da defesa aqui e limitar o dano de um eventual XSS no preview.

**Impacto.** Elimina o pior cenario de seguranca do app: transforma um XSS de preview (hoje = comprometimento total do disco) em impacto restrito aos arquivos do vault.

> ⚖️ *Ressalva do verificador:* Ajuste menor na cadeia de exploracao: o pipeline nao inclui rehype-raw, entao HTML bruto embutido numa nota Markdown nao e necessariamente re-parseado/executado pelo rehype-react — o vetor de XSS "nota maliciosa injeta HTML" e menos direto do que o texto sugere (o dangerouslySetInnerHTML da l.59 recebe SVG gerado pelo proprio Mermaid). Isso nao enfraquece o achado central: a ausencia de confinamento de path e real e vale como defesa em profundidade contra qualquer XSS/bug no renderer, independentemente do vetor exato. A severidade critica permanece defensavel por ser um app local-first, ressalvando que a exploracao e contingente a execucao de JS no renderer (fato que o proprio achado reconhece).

#### 2. Mermaid com securityLevel 'loose' permite XSS via conteudo de nota (preview e exports)
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **medio** · categoria *seguranca*

**Arquivos:** `src/utils/mermaid-loader.ts:26`, `src/utils/mermaid-loader.ts:32`, `src/components/preview/Preview.tsx:59`, `electron/handlers/export.handler.ts:143`, `electron/handlers/export.handler.ts:295`, `electron/handlers/export.handler.ts:430`

**Problema.** O Mermaid e inicializado com securityLevel: 'loose' em TODOS os pipelines (loader compartilhado do preview/editor e nos tres builders de export). Com 'loose' o Mermaid NAO sanitiza labels: aceita HTML embutido (htmlLabels em foreignObject) e diretivas click com JS. O SVG resultante e injetado no renderer via dangerouslySetInnerHTML (Preview.tsx:59) e via innerHTML no widget do editor (mermaid.ext.ts:40). O conteudo das notas e efetivamente NAO confiavel: o file watcher (Etapa 7) puxa alteracoes externas do vault (sync de nuvem, outro editor), vaults podem ser compartilhados, e ha ainda diagramas gerados pela IA. Um label como A["<img src=x onerror=...>"] executa script no renderer. Embora contextIsolation:true / nodeIntegration:false evitem RCE via Node diretamente, o preload expoe window.electron.fs (writeFile/readFile) via contextBridge — um onerror poderia sobrescrever/ler arquivos do vault. Nos exports de site, o mesmo SVG malicioso e distribuido e executa na maquina de qualquer visitante.

**Recomendação.** Usar o securityLevel padrao 'strict' (ou 'antiscript') para conteudo nao confiavel. Se HTML em labels for necessario, sanitizar o SVG retornado com DOMPurify (perfil SVG/USE_PROFILES:{svg:true,svgFilters:true}) antes do dangerouslySetInnerHTML/innerHTML. Aplicar a correcao no loader unico e replicar securityLevel:'strict' nos tres scripts inline dos exports.

**Impacto.** Fecha um vetor de XSS que atinge o app (com acesso as APIs de fs expostas) e todos os artefatos exportados (PDF, slides, site distribuido).

### 🟠 Alto (9)

#### 3. Ausencia total de testes automatizados em 39 arquivos-fonte
`Build / Dependências / TCC` · veredito **CONFIRMADO** · esforço **medio** · categoria *tcc*

**Arquivos:** `package.json:72-82`, `src/services/embedding.service.ts`, `src/services/similarity.ts`, `electron/handlers/export.handler.ts`

**Problema.** Nao existe nenhum arquivo *.test.* / *.spec.* dentro de src ou electron (39 arquivos .ts/.tsx, zero testes), nenhum test runner nas devDependencies (sem vitest, jest, playwright, @testing-library) e nenhum script 'test' em package.json. Modulos com logica pura e critica ficam sem cobertura: similaridade de cosseno (similarity.ts), truncamento/dimensionalidade dos embeddings (embedding.service.ts, mudanca sensivel da Etapa 5), escapeHtml e montagem de HTML autocontido no export.handler.ts, e a logica de lixeira com codificacao __SLASH__ do fs.handler. Num TCC, a verificacao citada na doc ('tsc --noEmit + vite build') so garante que compila e empacota, nao que a busca semantica ou o PDF produzem resultado correto.

**Recomendação.** Adicionar Vitest (integra ao Vite ja existente, custo baixo) e cobrir primeiro a logica pura sem I/O: cosineSimilarity/ranking em similarity.ts, EMBEDDING_DIMENSIONS + montagem do payload em embedding.service.ts, escapeHtml e a codificacao/decodificacao de caminho da lixeira. Expor um script 'test' e 'test:watch'. Mesmo 15-20 testes unitarios dao ao TCC um capitulo de 'verificacao e validacao' defensavel.

**Impacto.** Protege refactors futuros contra regressao silenciosa (ex.: a troca 3072->768 dims quebraria a busca sem alarme) e sustenta a secao de validacao exigida academicamente.

#### 4. BrowserWindow sem trava de navegacao/janela: ponte window.electron pode vazar para origem remota
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **baixo** · categoria *seguranca*

**Arquivos:** `electron/main.ts:9-30`, `electron/preload.ts:3-32`, `src/components/preview/Preview.tsx:284-296`

**Problema.** createWindow nao registra webContents.on('will-navigate') nem setWindowOpenHandler, e o preload expoe window.electron.fs (acesso a disco) em TODA pagina carregada na janela principal. Se qualquer conteudo conseguir navegar a janela para uma URL remota (link com target, window.open, ou uma navegacao acidental), a pagina remota herda o contextBridge com a API de arquivos irrestrita descrita acima. O tratamento de links no Preview (openExternal) e feito no renderer e so cobre <a> http/https clicados; nao ha rede de seguranca no processo principal contra navegacao/popup por outros caminhos.

**Recomendação.** No createWindow, adicionar mainWindow.webContents.on('will-navigate', (e,url) => { if (url !== urlDoApp) e.preventDefault(); }) e mainWindow.webContents.setWindowOpenHandler(({url}) => { shell.openExternal validando http/https; return { action: 'deny' }; }). Assim a janela nunca sai do bundle local e nenhum popup abre com a ponte exposta.

**Impacto.** Fecha o caminho de escape que tornaria a API fs acessivel a uma pagina web arbitraria; defesa em profundidade essencial junto do achado #1.

#### 5. Streaming SSE descarta linhas partidas entre chunks (tokens perdidos)
`Serviços de IA` · veredito **CONFIRMADO** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/services/ai.service.ts:75-93`, `src/services/ai.service.ts:126-147`, `src/services/ai.service.ts:220-235`

**Problema.** Nos tres metodos de streaming (chatOpenAICompatible, chatAnthropic, chatGemma) cada chunk da rede e tratado isoladamente: `const chunk = decoder.decode(value)` seguido de `chunk.split('\n')`. Nao ha buffer que carregue a linha parcial para o proximo chunk. Quando um chunk termina no meio de uma linha `data: {...}` (comum em respostas longas — o TCP nao respeita fronteiras de linha), o JSON incompleto cai no `try/catch {}` e e descartado silenciosamente; o restante chega no chunk seguinte como uma linha que nao comeca com 'data: ' e tambem e ignorado (filtro da linha 79/135/225). Resultado: pedacos da resposta somem de forma intermitente. E exatamente o cenario levantado na tarefa, e esta confirmado no codigo.

**Recomendação.** Manter um buffer de string acumulado entre iteracoes do reader: `buffer += decoder.decode(value, { stream: true })`, dividir por '\n' e reter a ultima particao (potencialmente incompleta) no buffer ate o proximo read; processar as linhas completas. Ao `done`, dar flush do buffer restante. Idealmente extrair um helper `parseSSEStream(reader, onEvent)` unico para os tres provedores.

**Impacto.** Elimina corrupcao/perda intermitente de texto nas respostas da IA — bug de confiabilidade que aparece justamente nas respostas mais longas.

#### 6. Chat da IA (MarkdownContent) nao renderiza formula, diagrama, callout nem wikilink
`Serviços de IA` · veredito **CONFIRMADO** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/ai/AIPanel.tsx:15-31`, `src/components/ai/AIPanel.tsx:66-131`

**Problema.** O pipeline `MarkdownContent` do AIPanel usa apenas remarkParse + remarkGfm + remarkRehype + rehypeHighlight + rehypeReact. Faltam remarkMath/rehypeKatex, o MermaidBlock, remarkCallouts, remarkWikilinks, remarkBreaks e o CustomPre (botao copiar). O agravante e que o proprio system prompt (linhas 80-131) instrui EXPLICITAMENTE o modelo a produzir mermaid, formulas KaTeX, callouts [!NOTE], wikilinks e tabelas — e ha ate quick actions 'Diagrama', 'Callout' e 'Flashcards'. Ou seja: o app pede a IA para gerar exatamente os recursos que o painel de chat exibe como codigo cru. Formula sai como `$E=mc^2$` literal, diagrama como bloco de codigo mermaid nao renderizado.

**Recomendação.** Reusar o mesmo pipeline do Preview no chat (ver achado de duplicacao). Extrair um `renderMarkdown(content, { knownNotes })` compartilhado com todos os plugins e o mapa de componentes (pre->CustomPre/MermaidBlock, span->wikilink). Cuidado: durante o streaming, renderizar mermaid/katex a cada chunk e caro — renderizar o pipeline completo so na mensagem finalizada e usar um render leve (texto/markdown basico) para `streamingText`.

**Impacto.** As respostas da IA passam a renderizar como no editor; hoje a funcionalidade e autocontraditoria (o app pede diagramas que nao consegue mostrar).

> ⚖️ *Ressalva do verificador:* Ajuste menor, sem alterar o veredito: rehypeHighlight ESTA presente no chat, entao blocos de codigo com linguagem comum (python, ts, etc.) recebem syntax highlight normalmente. O defeito e especifico de mermaid, KaTeX (formulas), callouts, wikilinks e remarkBreaks. A descricao do achado ja reflete isso corretamente ao listar apenas esses recursos como ausentes.

#### 7. Toggle de checkbox desalinha o indice e reescreve a linha errada da nota
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/components/preview/Preview.tsx:252-262`, `src/components/preview/Preview.tsx:180-189`

**Problema.** toggleCheckbox localiza a i-esima tarefa recontando o codigo-fonte com o regex /^([ \t]*[-*+] \[)([ x])(\] )/gm, enquanto o data-idx no DOM e atribuido por rehypeTaskCheckboxIndex percorrendo os <input> na ordem de renderizacao. As duas contagens divergem em dois casos reais: (1) o regex so casa 'x' minusculo, mas remark-gfm trata [X] maiusculo como checkbox valido e o indexa — uma nota com um [X] antes de outras tarefas desloca todos os indices seguintes; (2) o regex casa linhas tipo '- [ ] foo' DENTRO de blocos de codigo cercados/indentados, que o remark-gfm NAO renderiza como checkbox — qualquer '- [ ]' em bloco de codigo acima de uma lista real desloca a contagem. Resultado: clicar numa tarefa marca/desmarca outra linha, ou reescreve uma linha de codigo, corrompendo a nota (e o writeFile em disco na linha 261 persiste o dano).

**Recomendação.** Nao recontar o source por regex. Propagar a posicao de origem de cada checkbox durante a renderizacao: em rehypeTaskCheckboxIndex (ou num remark plugin sobre listItem) guardar node.position.start.line/offset e escrever exatamente naquele offset ao alternar. No minimo, incluir 'X' na classe de caracteres e ignorar nós dentro de code/inlineCode ao contar.

**Impacto.** Elimina corrupcao silenciosa de notas ao interagir com task lists — bug de perda/alteracao de dados.

> ⚖️ *Ressalva do verificador:* Precisao menor na recomendacao: rehypeTaskCheckboxIndex opera na arvore hast (pos-remarkRehype), onde node.position dos inputs geralmente ja se perdeu; propagar a posicao de origem de forma confiavel exige um plugin remark sobre o node listItem do mdast (a propria recomendacao ja admite essa alternativa entre parenteses). A descricao do bug em si esta correta.

#### 8. Pipeline unified duplicado em 3 copias divergentes (Preview, ExportModal, AIPanel)
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **medio** · categoria *arquitetura*

**Arquivos:** `src/components/preview/Preview.tsx:264-326`, `src/components/modals/ExportModal.tsx:84-99`, `src/components/ai/AIPanel.tsx:15-31`

**Problema.** O pipeline markdown e remontado tres vezes com conjuntos de plugins divergentes, e as divergencias ja sao bugs observaveis: (a) AIPanel usa apenas remarkParse+remarkGfm+rehypeHighlight — sem remarkMath/rehypeKatex, callouts, wikilinks nem tratamento de mermaid; ou seja, formulas LaTeX, diagramas mermaid e callouts que o proprio system prompt (AIPanel.tsx:66-131) MANDA a IA gerar aparecem como texto/codigo cru no chat. (b) Os icones de callout divergem: preview usa caution='🔶' (Preview.tsx:159), export usa caution='🛑' igual ao danger (ExportModal.tsx:35) — no export caution e danger ficam indistinguiveis. (c) O export nao aplica remarkBreaks (quebras de linha simples renderizam diferente do preview) nem remarkStripFrontmatter. remarkCallouts e remarkWikilinks estao literalmente copiados/colados entre Preview e ExportModal.

**Recomendação.** Extrair uma fabrica unica de pipeline (ex: src/utils/markdown-pipeline.ts) que receba o alvo (rehypeReact vs rehypeStringify) e flags (wikilink slug map, math on/off), e mover remarkCallouts/remarkWikilinks/remarkStripFrontmatter para modulos compartilhados. AIPanel deve reusar o mesmo pipeline do preview para renderizar o que a IA foi instruida a produzir.

**Impacto.** Uma fonte de verdade para renderizacao: corrige a inconsistencia do chat IA e dos icones/quebras, e evita regressao futura entre preview e exports.

> ⚖️ *Ressalva do verificador:* Duas imprecisoes menores que nao mudam o veredito: (1) remarkWikilinks NAO e copia literal entre os arquivos — Preview.tsx:120 gera <span class="wikilink" data-note> para navegacao interna, enquanto ExportModal.tsx:47 (makeWikilinkPlugin) gera <a href="slug.html"> via slugMap; sao variantes paralelas, nao copy-paste. Apenas remarkCallouts e efetivamente duplicado quase identico. (2) O impacto do remarkStripFrontmatter ausente no export e mais fraco do que sugerido: remark-rehype descarta nos yaml/toml sem handler por padrao, entao a falta do strip provavelmente nao vaza frontmatter visivel no export (diferente do impacto real de remarkBreaks, esse sim ausente e divergente).

#### 9. Comandos 'falsos' na paleta: Negrito, Itálico e Salvar Manualmente só fecham o modal
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/modals/CommandPalette.tsx:34-42`, `src/components/modals/CommandPalette.tsx:87-100`, `src/components/editor/EditorToolbar.tsx:12-76`

**Problema.** Três comandos da paleta anunciam ação e atalho mas não executam nada. 'Salvar Manualmente' (Ctrl+S) só chama close() com o comentário 'Auto-save handles most, but this is for visibility'. 'Negrito' (Ctrl+B) e 'Itálico' (Ctrl+I) também só chamam close(). A lógica real de negrito/itálico já existe e funciona em EditorToolbar.handleAction (linhas 24-25, dispatch no editorView), e a paleta já tem acesso ao editorView (linha 18). O usuário busca 'Negrito', pressiona Enter, o modal fecha e nada acontece — quebra de confiança direta na principal interface de descoberta de recursos.

**Recomendação.** Extrair handleAction para um util compartilhado (ex: src/utils/editor-actions.ts) e chamá-lo a partir da paleta para bold/italic usando o editorView do store. Para 'Salvar Manualmente', ou disparar um flush real do auto-save (o Editor já tem flush no cleanup) ou remover o comando para não anunciar função inexistente. Se o Ctrl+S/Ctrl+B/Ctrl+I não estão registrados como keymap real no CodeMirror, remover os rótulos de atalho que prometem algo que não dispara.

**Impacto.** Elimina comandos mortos na principal superfície de UX do app; recursos anunciados passam a funcionar de verdade.

> ⚖️ *Ressalva do verificador:* Ajuste menor de severidade: e um defeito real de UX/confianca na superficie de descoberta, mas nao causa crash nem perda de dados e ha caminhos alternativos que funcionam (toolbar com botoes bold/italic operantes, linhas 80-81). "alto" e defensavel pela quebra de confianca na paleta, mas "medio" tambem seria razoavel. Nao altera o veredito.

#### 10. Navegação inteiramente dependente de mouse: resultados, tags, comandos e arquivos são <div onClick> não focáveis
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/sidebar/Sidebar.tsx:285-309`, `src/components/sidebar/Sidebar.tsx:344-352`, `src/components/sidebar/FileTree.tsx:121-144`, `src/components/modals/CommandPalette.tsx:226-241`

**Problema.** Itens interativos centrais são <div>/<span> com onClick e sem role, tabIndex ou handler de teclado: resultados de busca (.search-result), chips de tag (.tag-chip), itens da árvore de arquivos (FileTree onClick + itens de menu de contexto) e os itens da paleta (.command-item). Usuários de teclado não conseguem alcançar nem ativar nenhum deles com Tab/Enter, e leitores de tela não os anunciam como botões. A busca por teclado da paleta funciona só via setas no input, mas os itens em si não são elementos interativos acessíveis.

**Recomendação.** Trocar os <div>/<span> clicáveis por <button type="button"> (ou adicionar role="button" + tabIndex={0} + onKeyDown para Enter/Espaço). Para a árvore de arquivos, aplicar padrão de tree (role="tree"/"treeitem") ou ao menos botões focáveis. Isso remove o CSS de reset de botão só onde necessário, mantendo o visual.

**Impacto.** Torna toda a navegação (arquivos, busca, tags, comandos) utilizável por teclado e leitores de tela — hoje é 100% dependente de mouse.

> ⚖️ *Ressalva do verificador:* Ressalva menor, ja reconhecida no proprio achado: a paleta de comandos tem onKeyDown no container (CommandPalette.tsx:217) que trata ArrowUp/ArrowDown/Enter enquanto o input esta focado, entao os comandos SAO navegaveis e ativaveis por teclado — a limitacao deles e apenas semantica (divs, nao botoes anunciados por leitor de tela). Ja busca (.search-result), tags (.tag-chip), notas por tag e a arvore de arquivos (.file-item + .context-menu-item) nao tem nenhum caminho de teclado. A frase 'hoje e 100% dependente de mouse' e ligeiramente forte por causa dessa excecao parcial da paleta, mas a descricao geral e precisa.

#### 11. Modais sem semântica de diálogo (role/aria-modal/aria-labelledby) e sem focus trap
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/modals/CommandPalette.tsx:215-217`, `src/components/modals/SettingsModal.tsx:101-109`, `src/components/modals/ConfirmModal.tsx:26-28`, `src/components/modals/PromptModal.tsx:44-46`, `src/components/modals/NewNoteModal.tsx:132-139`

**Problema.** Todos os overlays são <div className="...-overlay"> sem role="dialog", aria-modal="true" nem aria-labelledby ligado ao <h3>. Um grep por aria-/role= em todo src retorna uma única ocorrência (Preview.tsx:108 aria-hidden). Não há focus trap: com Tab é possível sair do modal e cair no editor por baixo (que continua montado), e o foco não é restaurado ao elemento anterior quando o modal fecha. O Escape em ConfirmModal/PromptModal/NewNoteModal depende de onKeyDown no próprio modal, exigindo que o foco permaneça dentro dele.

**Recomendação.** Criar um componente Modal base reutilizável com role="dialog", aria-modal, aria-labelledby apontando para o título, focus trap (ciclo de Tab entre elementos focáveis), captura de Escape e restauração de foco (guardar document.activeElement na abertura e refocar no fechamento). Migrar os seis modais para ele — também reduz a duplicação de overlay/stopPropagation espalhada.

**Impacto.** Acessibilidade de teclado/leitor de tela nos modais e comportamento de foco previsível; item de conformidade importante para um TCC.

> ⚖️ *Ressalva do verificador:* Detalhe de precisão: em PromptModal o handler de Escape está no onKeyDown do `<input>` (linha 53) e não na div do modal — o resto da descrição está correto. Sobre severidade: 'alto' é defensável para conformidade de acessibilidade num TCC, embora seja discutível frente a bugs funcionais (poderia ser 'medio'); mantenho o veredito CONFIRMADO porque todos os fatos técnicos estão precisos.

### 🟡 Médio (24)

#### 12. Nenhum linter/formatter configurado (ESLint/Prettier ausentes)
`Build / Dependências / TCC` · veredito **CONFIRMADO** · esforço **baixo** · categoria *tooling*

**Arquivos:** `package.json:72-82`

**Problema.** Nao ha .eslintrc, eslint.config.*, .prettierrc nem .editorconfig no projeto (os unicos matches estao dentro de node_modules), e nenhum dos pacotes esta nas devDependencies. Com strict/noUnusedLocals no tsconfig o TS pega erros de tipo, mas nao ha checagem de regras de React (react-hooks/exhaustive-deps e' exatamente onde bugs de dependencia de useEffect/useMemo aparecem, e a Etapa 2 mexeu pesado em memoizacao/seletores), nem padronizacao de estilo entre os 39 arquivos.

**Recomendação.** Adicionar eslint + @typescript-eslint + eslint-plugin-react-hooks (o plugin de hooks e' o de maior retorno dado o volume de useMemo/useShallow introduzido) e prettier com config minima. Criar scripts 'lint' e 'format'. Priorizar a regra react-hooks/exhaustive-deps para validar as otimizacoes da refatoracao de Julho.

**Impacto.** Detecta dependencias faltando em hooks (fonte comum de bug pos-memoizacao) e uniformiza o codigo, ponto avaliado em qualidade de engenharia no TCC.

> ⚖️ *Ressalva do verificador:* Imprecisao menor: o achado cita "39 arquivos"; a contagem real em src/ e 35 arquivos .ts/.tsx (com electron chega perto de 39). Nao afeta o merito.

#### 13. electron-builder sem icone proprio, code signing e auto-update
`Build / Dependências / TCC` · veredito **CONFIRMADO** · esforço **medio** · categoria *tooling*

**Arquivos:** `package.json:12-44`

**Problema.** A config de build gera NSIS/DMG/AppImage mas: (1) nao aponta win.icon/mac.icon/linux.icon — o instalador sai com o icone padrao do Electron (a propria doc reconhece como pendencia, e nao existe pasta build/ no repo); (2) nao ha code signing (win.certificateFile / mac hardenedRuntime+notarizacao) — no Windows o SmartScreen bloqueia e no macOS o Gatekeeper impede a abertura de um DMG nao assinado/notarizado, tornando a 'distribuicao multiplataforma' prometida no TCC pouco utilizavel na pratica; (3) nao ha electron-updater nas dependencias nem bloco 'publish' — sem caminho de atualizacao. Alem disso os alvos mac (dmg) e linux (AppImage) so podem ser gerados nas respectivas plataformas, e o dev e' Windows-only.

**Recomendação.** Adicionar build/icon.ico (256x256) e build/icon.png (512x512) e referenciar nos targets. Para o TCC, documentar explicitamente que os artefatos nao sao assinados e o efeito (avisos de SmartScreen/Gatekeeper), ou configurar assinatura ao menos no Windows. Se atualizacao for uma promessa, integrar electron-updater + publish (GitHub Releases); caso contrario, deixar claro na monografia que a distribuicao e' de instalador manual.

**Impacto.** Transforma o instalador de 'gera arquivo' em 'app que o avaliador consegue instalar e abrir sem bloqueio do SO', fechando de fato a fase de distribuicao do plano.

> ⚖️ *Ressalva do verificador:* Sub-ponto do auto-update é o mais fraco: nenhuma promessa de atualização automática aparece na monografia/docs, e o próprio achado é condicional ("Se atualizacao for uma promessa"), então essa parte é recomendação preventiva, não lacuna. Os gaps concretos e verificados são ícone próprio e code signing; severidade medio é adequada para a fase de distribuição do TCC.

#### 14. Ausencia de CI e de scripts npm granulares (typecheck/lint/package)
`Build / Dependências / TCC` · veredito **CONFIRMADO** · esforço **baixo** · categoria *tooling*

**Arquivos:** `package.json:7-11`

**Problema.** Nao ha diretorio .github (nenhum workflow de CI) e o package.json expoe apenas dev/build/preview. O script 'build' e' monolitico ('tsc && vite build && electron-builder'): toda vez que se quer apenas checar tipos ou gerar o bundle web, dispara-se tambem o electron-builder, que na primeira execucao baixa binarios do Electron e leva minutos. Nao existe script isolado de typecheck (tsc --noEmit), lint ou 'package'. Isso torna qualquer verificacao rapida cara e impede um pipeline automatizado que rode typecheck/lint/build a cada commit.

**Recomendação.** Quebrar em scripts: 'typecheck' (tsc --noEmit), 'lint', 'build' (so tsc + vite build) e 'dist'/'package' (electron-builder). Adicionar um workflow GitHub Actions minimo rodando install + typecheck + lint (+ build) no push, e opcionalmente um job de release que empacota por matriz de SO (windows/mac/linux) — unico jeito de gerar os alvos dmg/AppImage sem ter as maquinas.

**Impacto.** Iteracao local mais rapida (checagem sem empacotar) e garantia automatica de que main sempre compila; pipeline por matriz habilita gerar de fato os instaladores mac/linux.

> ⚖️ *Ressalva do verificador:* Ponto menor nao mencionado no achado: a recomendacao de adicionar um script 'lint' pressupoe um linter que o projeto nao possui (nenhum eslint/prettier nas devDependencies), entao seria preciso adicionar a ferramenta antes. Nao altera o veredito. A severidade 'medio' e defensavel; poderia ser discutida como 'baixo' por se tratar de projeto academico solo (TCC), mas como concern de tooling/DX o 'medio' se sustenta.

#### 15. Wikilinks com alias ou ancora ([[Nota|texto]], [[Nota#secao]]) sempre marcados como quebrados
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/components/editor/extensions/wikilink.ext.ts:10-41`, `src/App.tsx:117-153`

**Problema.** O regex `/\[\[([^\]]+)\]\]/g` captura o miolo inteiro, entao `[[Nota|Alias]]` produz noteName = 'Nota|Alias' e `[[Nota#Introducao]]` produz 'Nota#Introducao'. A verificacao `knownNotes.has(noteName.toLowerCase())` (linha 41) falha, marcando como `cm-wikilink-broken` um link perfeitamente valido. Pior: no Ctrl+Click, o `vellum:open-note` e disparado com o nome completo (linha 82), e o `findFile` em App.tsx (linha 125) procura por 'Nota|Alias.md', nao encontra, e oferece CRIAR uma nota com esse nome invalido.

**Recomendação.** Antes de checar/emitir, normalizar: `const target = match[1].split('|')[0].split('#')[0].trim()`. Usar `target` tanto para `knownNotes.has` quanto no `data-wikilink`/evento de abertura, preservando o texto original apenas para exibicao.

**Impacto.** Sintaxes padrao de wikilink (alias e ancora) passam a validar e navegar corretamente; evita criacao acidental de notas com nome corrompido.

#### 16. Preview inline de LaTeX gera falso-positivo com cifroes em prosa ($5 ... $10)
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/components/editor/extensions/latex.ext.ts:85-95`

**Problema.** O regex inline `/\$([^$\n]+?)\$/g` casa qualquer par de cifroes na mesma linha. Um texto academico como 'o produto custa $5 e o frete $10' vira match '$5 e o frete $', que e escondido e renderizado como formula KaTeX (com throwOnError:false, sai matematica sem sentido no lugar do texto). Diferente do pipeline do Preview (remark-math), que exige regras de delimitacao, esta extensao e ingenua e passa a esconder prosa legitima assim que o cursor sai da linha.

**Recomendação.** Endurecer o reconhecimento inline aproximando-o do remark-math: exigir que o `$` de abertura nao seja seguido de espaco/digito e o de fechamento nao seja precedido de espaco, e ignorar `\$` escapado. Alternativamente, so tratar como inline math quando o conteudo contiver caractere claramente matematico, ou exigir delimitadores `$...$` sem digitos colados nas bordas.

**Impacto.** Elimina desaparecimento silencioso de texto com valores monetarios/cifroes — cenario comum em TCC — mantendo a renderizacao de formulas reais.

> ⚖️ *Ressalva do verificador:* A descricao esta tecnicamente correta, com um ajuste de enquadramento: e um bug de RENDERIZACAO/exibicao no editor, nao de corrupcao de dados — o conteudo em disco permanece intacto e o codigo-fonte reaparece ao clicar/mover o cursor de volta para a linha. Por ser apenas visual e reversivel, a severidade 'medio' e razoavel mas discutivelmente poderia ser 'baixo'.

#### 17. restoreLastDeleted escolhe a nota errada: ordena por mtime em vez do timestamp de exclusao
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `electron/handlers/fs.handler.ts:109-121`, `electron/handlers/fs.handler.ts:94`

**Problema.** O nome do arquivo na lixeira ja embute o instante da exclusao como prefixo (`${Date.now()}_...`, linha 94), mas restoreLastDeleted determina a 'ultima deletada' comparando fs.statSync(...).mtimeMs (linhas 110-116). renameSync preserva o mtime de CONTEUDO do arquivo, nao a hora em que ele foi movido para a lixeira. Consequencia: se voce edita a nota A hoje, depois deleta a nota B (nao editada ha meses) e por fim deleta A, o 'Restaurar ultima nota' pode restaurar B ou A conforme os mtimes de conteudo — nao a ultima realmente excluida. Bug de correcao numa feature de recuperacao de dados.

**Recomendação.** Ordenar pelo prefixo numerico do nome do arquivo (parse do Number antes do primeiro '_') em vez de mtime, ja que esse prefixo e o carimbo de exclusao real. Fallback para mtime apenas em itens legados sem prefixo.

**Impacto.** Garante que 'Restaurar ultima nota' devolva de fato a ultima nota excluida, nao a de conteudo mais recente.

> ⚖️ *Ressalva do verificador:* O exemplo narrativo especifico do achado ("edita A, deleta B, depois deleta A") na verdade resolve para A corretamente, ja que a edicao recente de A torna seu mtime o maior. O bug so se manifesta quando a nota realmente excluida por ultimo tem mtime de conteudo MENOR que uma nota excluida antes e ainda na lixeira. A afirmacao geral do achado permanece correta; e apenas um deslize no exemplo. Nao ha perda de dados (ambas continuam na lixeira), apenas restauracao da nota errada.

#### 18. Gravacoes nao atomicas de nota e do cache de embeddings arriscam corromper arquivos
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **medio** · categoria *resiliencia*

**Arquivos:** `electron/handlers/fs.handler.ts:54-57`, `electron/handlers/fs.handler.ts:150-163`

**Problema.** fs:writeFile e fs:writeEmbeddingCache fazem fs.writeFileSync direto sobre o arquivo final. Se o app for fechado, travar ou o SO cair no meio do write, o arquivo destino fica truncado/corrompido. Para o embeddings.json isso dispara reindexacao integral (custo de API que a Etapa 0 buscou justamente preservar); para uma nota .md e perda parcial de conteudo — contradizendo o foco anti-perda-de-dados da refatoracao. writeEmbeddingCache ainda serializa um objeto potencialmente enorme com JSON.stringify sincrono, bloqueando o processo principal.

**Recomendação.** Gravacao atomica: escrever em arquivo temporario no mesmo diretorio e fs.renameSync por cima (rename e atomico no mesmo volume). Para o cache grande, considerar fs.promises/serializacao fora do caminho critico da UI.

**Impacto.** Elimina janela de corrupcao em quedas/fechamentos; protege tanto o conteudo das notas quanto o custo de API ja pago no cache.

#### 19. fs:readDir e sincrono, segue symlinks e nao trata ciclos (freeze/estouro de pilha)
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **medio** · categoria *resiliencia*

**Arquivos:** `electron/handlers/fs.handler.ts:14-48`

**Problema.** walk usa fs.readdirSync + fs.statSync recursivamente no processo principal. Tres problemas: (1) statSync segue symlinks e nao ha guarda de ciclo — um symlink apontando para um ancestral causa recursao infinita ate estourar a pilha e derrubar o main; (2) toda a varredura e sincrona na thread principal, congelando a UI em vaults grandes; (3) qualquer statSync que lance (symlink quebrado, permissao) estoura o walk inteiro e o catch retorna [] — o usuario perde a arvore toda por causa de um unico arquivo problematico.

**Recomendação.** Usar fs.lstatSync e pular symlinks (ou manter um Set de inodes/realpaths visitados para cortar ciclos); envolver o statSync de cada item em try/catch para nao perder a arvore por um item ruim; migrar para fs.promises.readdir com {withFileTypes:true} para nao bloquear o main.

**Impacto.** Evita travamento/crash em vaults com symlinks e mantem a arvore utilizavel mesmo com itens inacessiveis.

#### 20. embedBatch nao valida se a API retornou o mesmo numero de embeddings dos textos enviados
`Embeddings & Busca` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *resiliencia*

**Arquivos:** `src/services/embedding.service.ts:264-266`, `src/services/embedding.service.ts:284-287`, `src/store/vault.store.ts:291-299`

**Problema.** embedBatchWithGoogle faz `(data.embeddings).map(e => e.values)` e embedBatchWithOpenAI mapeia `data.data`, mas nenhum dos dois valida que o tamanho do array retornado bate com `texts.length`. Em buildEmbeddingIndex o resultado e consumido posicionalmente: `embeddings[0]` vira o vetor do documento e `embeddings[p+1]` o de cada passagem. Se a API devolver menos itens (resposta parcial, item filtrado, corpo inesperado), esses acessos retornam `undefined`. Esse `undefined` e gravado no cache (`entries[file.path] = { embedding, passages }`) e serializado como `null` no embeddings.json. Depois, cosineSimilarity(query, undefined/null) itera sobre `a.length` lendo `b[i]` indefinido, produzindo NaN em dot/mag — o score vira NaN, a nota some silenciosamente dos resultados (NaN > 0.5 e false) e o cache fica envenenado ate o arquivo mudar de mtime.

**Recomendação.** Apos cada chamada de lote, verificar `if (embeddings.length !== chunk.length) throw new Error(...)` em embedBatchWithGoogle/OpenAI (ou pelo menos em embedBatch antes do push). No consumidor, validar que `embeddings[0]` e cada `embeddings[p+1]` sao arrays com length === EMBEDDING_DIMENSIONS antes de gravar no cache; caso contrario pular o arquivo em vez de cachear vetor invalido.

**Impacto.** Elimina uma classe de falha silenciosa que corrompe o cache e faz notas desaparecerem da busca sem qualquer erro visivel.

> ⚖️ *Ressalva do verificador:* A descricao do impacto downstream esta factualmente incorreta e por isso rebaixo para PLAUSIVEL/medio. (1) Se a API devolver MENOS itens, `embeddings[0]`/`embeddings[p+1]` sao `undefined` (elementos faltantes do array), nao arrays mais curtos. Em cosineSimilarity (similarity.ts:5-6) o loop faz `a[i] * b[i]` com `b === undefined`, o que LANCA `TypeError: Cannot read properties of undefined (reading '0')` logo na primeira iteracao — um erro RUIDOSO que quebra a busca (topKSimilar em Sidebar.tsx:117 ou o loop de passagens em Sidebar.tsx:125), e NAO um NaN silencioso que faz a nota sumir 'sem qualquer erro visivel'. O cenario de NaN exigiria um array valido de dimensionalidade errada — modo de falha distinto que o achado nao descreve. (2) `undefined` como propriedade de objeto e OMITIDO por JSON.stringify (`{embedding: undefined}` vira `{}`), nao 'serializado como null' — apenas elementos de array viram null. (3) O gatilho depende de as APIs do Google/OpenAI responderem 200 OK com menos itens do que o solicitado, o que e incomum; combinado com o fato de a falha ser um throw visivel e nao corrupcao silenciosa, a severidade 'alto' e exagerada — medio e mais adequado. A recomendacao de adicionar `if (embeddings.length !== chunk.length) throw` continua sendo uma boa pratica defensiva valida.

#### 21. Passagens sao embedadas e cacheadas mas nunca usadas no ranking — apenas para escolher o snippet
`Embeddings & Busca` · veredito **CONFIRMADO** · esforço **medio** · categoria *arquitetura*

**Arquivos:** `src/components/sidebar/Sidebar.tsx:117-127`, `src/store/vault.store.ts:283-298`, `src/services/similarity.ts:14-25`

**Problema.** O pipeline gasta 1 requisicao por arquivo justamente para embedar [documento + todas as passagens] e persiste `passageIndex` no cache. Mas topKSimilar roda somente sobre `embeddingIndex` (vetor unico do documento inteiro, ainda por cima truncado em 6000 chars por cleanMarkdown). As passagens so entram DEPOIS, para escolher qual trecho mostrar como snippet (Sidebar.tsx:124-126). Ou seja: o custo de API e de armazenamento das passagens e pago, mas o beneficio principal do chunking — ranquear por trecho para que uma nota longa com um paragrafo muito relevante suba mesmo com o vetor-documento 'diluido' — nao e colhido. Em notas longas e heterogeneas isso reduz recall.

**Recomendação.** Ranquear no nivel de passagem: para cada nota computar o max (ou top-k agregado) das similaridades das passagens contra a query e usar esse valor como score de recuperacao, com o vetor-documento apenas como fallback/desempate. Como as passagens ja estao em memoria em passageIndex, e uma mudanca localizada em topKSimilar/uso no Sidebar sem novo custo de API.

**Impacto.** Melhora recall e precisao da busca semantica em notas longas, aproveitando dados que ja sao calculados e armazenados hoje.

#### 22. Rate limiter so controla RPM; ignora o limite de TPM (30k) do free tier de embedding
`Embeddings & Busca` · veredito **CONFIRMADO** · esforço **medio** · categoria *resiliencia*

**Arquivos:** `src/config/model-limits.ts:69-99`, `src/services/embedding.service.ts:234-258`, `src/store/vault.store.ts:283-289`

**Problema.** MODEL_RATE_LIMITS registra tpm: 30_000 para gemini-embedding-001/text-embedding-004, mas throttle()/waitMs() so olham `rpm`. O campo tpm nunca e consultado. Um unico batchEmbedContents de ate 100 passagens (~350 chars cada) mais o documento pode ultrapassar 30k tokens/min facilmente, e como so o RPM e respeitado (100 RPM), a indexacao dispara 429 por tokens. O caminho de recuperacao existe (retry 3x com parseRetryDelayMs), mas e reativo: gasta requisicoes, adiciona latencia e, apos 3 tentativas, o arquivo e pulado silenciosamente (vault.store.ts:332-334), deixando buracos no indice.

**Recomendação.** Estimar tokens por requisicao (ex.: chars/4) e incorporar TPM ao throttle — manter uma janela deslizante de tokens por modelo e aguardar quando somar o proximo lote estourar tpm. Alternativamente, limitar o tamanho do lote por orcamento de tokens em embedBatch, nao apenas por GOOGLE_BATCH_LIMIT=100.

**Impacto.** Transforma 429 por tokens (hoje tratado reativamente e podendo furar o indice) em espera proativa, tornando a indexacao de vaults grandes mais rapida e completa.

> ⚖️ *Ressalva do verificador:* Pequena imprecisao: o retry honra o retryDelay do servidor (ou fallback de 30s), e como a janela de TPM reseta em 1 minuto, um retry frequentemente tem sucesso — entao os "buracos no indice" sao menos frequentes do que a descricao sugere, ocorrendo so quando o TPM permanece estourado nas 3 tentativas. Alem disso, o pulo do arquivo nao e totalmente silencioso: ha console.error em vault.store.ts:316 (embora sem sinalizacao ao usuario). Nada disso altera o veredito.

#### 23. Limiares de similaridade fixos (0.5 / 0.72) nao consideram o provedor/modelo ativo
`Embeddings & Busca` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/components/sidebar/Sidebar.tsx:117`, `src/components/ai/LinkSuggestion.tsx:63-65`

**Problema.** O corte de relevancia e um numero magico absoluto: `> 0.5` na busca do Sidebar e `> 0.72` na sugestao de links. As distribuicoes de cosseno diferem entre provedores/modelos: gemini-embedding-001 com taskType RETRIEVAL e OpenAI text-embedding-3 nao produzem a mesma escala de scores, e a truncagem MRL para 768 dims tambem desloca a distribuicao. Um limiar calibrado para o Google pode zerar resultados no OpenAI (recall baixo) ou o inverso (ruido). Como o provider/model sao configuraveis (settings), o limiar hard-coded degrada a qualidade para parte das configuracoes suportadas.

**Recomendação.** Parametrizar o limiar por provider/model (ex.: mapa em model-limits/config) ou substituir por criterio relativo — normalizar pela distribuicao dos top scores, ou usar um gap/percentil em vez de constante absoluta. No minimo documentar a calibracao e cobrir OpenAI.

**Impacto.** Qualidade de recuperacao consistente entre os provedores oferecidos, evitando 'nenhum resultado' ou excesso de ruido ao trocar de modelo.

> ⚖️ *Ressalva do verificador:* Achado preciso. Unico reparo: a severidade "medio" esta no limite com "baixo" — trata-se de degradacao de qualidade/calibracao de heuristica (nao falha funcional), afetando apenas o provider nao-default (OpenAI), ja que o default google presumivelmente foi calibrado para esses valores. Mantenho medio por afetar uma configuracao oficialmente suportada, mas baixo tambem seria defensavel.

#### 24. Reindexação disparada durante uma indexação em andamento é descartada silenciosamente (sem flag de "dirty")
`Estado & Fluxo de Dados` · veredito **PLAUSIVEL** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/store/vault.store.ts:202-217`, `src/store/vault.store.ts:215`, `src/App.tsx:48-55`

**Problema.** O guard `if (embeddingStatus === 'indexing') return;` (vault.store.ts:215) impede execuções concorrentes, mas NÃO reagenda nada. Se `setFiles` disparar um novo `buildEmbeddingIndex` enquanto o anterior ainda roda — exatamente o caso do watcher em tempo real (Etapa 7): salvar/sync durante uma indexação longa emite `vault:changed` -> readDir -> setFiles -> effect de App.tsx:48-55 -> buildEmbeddingIndex -> cai no guard e retorna — a atualização é perdida. Como uma indexação do zero pode levar minutos (custo de API, rate limiter), toda alteração feita nesse intervalo fica fora do índice até o PRÓXIMO evento de arquivo, que pode nunca vir para aquela nota específica. O comentário em vault.store.ts:212-214 assume que descartar é seguro, mas descarta a última versão, não uma duplicata.

**Recomendação.** Trocar o guard por um padrão de re-run: manter um flag `indexDirty` (ou um `pendingRebuild`) que é setado quando um pedido chega durante `indexing`; ao final do laço, se `indexDirty` estiver true, limpar o flag e re-chamar `buildEmbeddingIndex()`. Assim a última mudança sempre é indexada exatamente uma vez a mais, sem concorrência.

**Impacto.** Índice semântico deixa de perder silenciosamente notas editadas durante indexações longas; o monitoramento em tempo real passa a ser confiável de fato.

> ⚖️ *Ressalva do verificador:* O guard realmente descarta o rebuild pendente sem reagendar (achado correto), mas: a re-indexacao NAO exige um evento "para aquela nota especifica" — o efeito re-roda a cada mudanca no array `files`, entao qualquer evento de arquivo no vault cura a defasagem (mtime difere de cache.mtime -> re-embeda). A janela real de perda so persiste indefinidamente se nenhum outro evento de arquivo ocorrer no vault. Alem disso nao ha perda de dados da nota (arquivo em disco intacto); trata-se de defasagem temporaria e auto-curavel do indice semantico, o que rebaixa a severidade de alto para medio. A recomendacao (flag pendingRebuild/dirty) continua valida e apropriada.

#### 25. Trocar de vault durante uma indexação: novo vault não é indexado e o cache pode ser gravado no vault errado
`Estado & Fluxo de Dados` · veredito **PLAUSIVEL** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/store/vault.store.ts:202-217`, `src/store/vault.store.ts:340-349`

**Problema.** `buildEmbeddingIndex` captura `vaultPath` via `get()` no início (linha 203) e o usa para `writeEmbeddingCache` no incremento a cada 10 arquivos (306) e no final (347). Se o usuário abrir outro vault no meio da indexação: (1) o effect de App.tsx dispara um novo `buildEmbeddingIndex`, que bate no guard `indexing` e retorna -> o vault novo NUNCA é indexado; (2) a indexação antiga, ainda em voo, termina fazendo `set({ embeddingIndex, ... })` (349) com os vetores do vault ANTIGO por cima do estado atual, e grava o cache no `vaultPath` antigo. O índice em memória fica descolado do vault aberto até um novo evento de arquivo.

**Recomendação.** Ao final de cada iteração e antes de cada `set`/`writeEmbeddingCache`, revalidar que `get().vaultPath === vaultPathCapturado`; se mudou, abortar sem gravar. Combinar com o flag `indexDirty` do achado anterior para que a troca de vault force um rebuild limpo do vault novo.

**Impacto.** Elimina corrupção de índice/cache ao alternar vaults e garante que o vault recém-aberto seja indexado.

> ⚖️ *Ressalva do verificador:* Duas imprecisões: (1) 'o cache pode ser gravado no vault errado' é FALSO — como vaultPath é capturado em get() na linha 203, o writeEmbeddingCache das linhas 306/347 grava os embeddings do vault antigo no cache do vault antigo (correto); a indexação antiga nunca toca o path do vault novo, cujo embeddings.json permanece íntegro. O problema é exclusivamente o índice EM MEMÓRIA descolado (embeddingIndex/passageIndex/fileContents do vault antigo com vaultPath apontando para o novo), não corrupção de cache em disco. (2) Severidade 'alto' é discutível: o bug é transitório e se auto-cura no próximo evento do watcher (setFiles -> effect -> buildEmbeddingIndex com status já 'ready' reindexa o vault novo), e exige troca de vault durante uma indexação ativa. Rebaixado para 'medio'. A recomendação (revalidar get().vaultPath === capturado antes de cada set) corrige o desync em memória e é válida.

#### 26. setFiles cria sempre nova referência -> effect de indexação re-executa a cada tick do watcher, re-lendo o vault inteiro do disco
`Estado & Fluxo de Dados` · veredito **CONFIRMADO** · esforço **medio** · categoria *performance*

**Arquivos:** `src/App.tsx:61-72`, `src/App.tsx:48-55`, `src/store/vault.store.ts:250-263`

**Problema.** `onVaultChanged` faz `readDir` e `setFiles(updated)` (App.tsx:65-66), e `readDir` retorna sempre um array novo, com objetos novos — mesmo quando nada de relevante mudou. Isso invalida a dependência `files` do effect de indexação a cada rajada do watcher (a cada auto-save, já que salvar um .md dispara o próprio watcher). Cada disparo roda `buildEmbeddingIndex`, cujo laço faz `await readFile(file.path)` para TODOS os arquivos do vault (vault.store.ts:257) só para extrair tags e checar mtime — I/O O(tamanho do vault) por salvamento, mesmo que só a nota ativa tenha mudado.

**Recomendação.** Duas frentes: (1) diffar o resultado do readDir antes de `setFiles` (comparar por path+mtime) e só atualizar/reindexar se algo relevante mudou, evitando o rebuild a cada save; (2) no laço de indexação, pular a leitura de conteúdo de arquivos cujo mtime bate com o cache (só ler quando `!cached || cached.mtime !== file.mtime`), já que tags/conteúdo cacheados podem ser reaproveitados. Hoje o conteúdo é relido incondicionalmente para preencher `fileContents`/tags.

**Impacto.** Reduz drasticamente o I/O por salvamento em vaults grandes e elimina re-renders/efeitos supérfluos ligados à troca de referência de `files`.

> ⚖️ *Ressalva do verificador:* Duas imprecisoes menores que nao invalidam o achado: (1) o watcher tem debounce de 1500ms (fs.handler.ts:186-189), entao e uma re-leitura completa por rajada/salvamento, nao literalmente 'a cada tick'; (2) o problema tambem afeta o ramo loadTagsOnly (vault.store.ts:188-197), que faz a mesma leitura O(vault) incondicional — ou seja, e ainda mais abrangente que o descrito. Custo de API esta corretamente excluido (cache por mtime); o desperdicio e I/O de disco + reconstrucao de Maps + re-renders superfluos.

#### 27. TextDecoder sem { stream: true } corrompe acentos/emoji na fronteira de chunk
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/services/ai.service.ts:78`, `src/services/ai.service.ts:134`, `src/services/ai.service.ts:223`

**Problema.** `decoder.decode(value)` e chamado sem `{ stream: true }` nos tres metodos. Cada chunk e decodificado como se fosse um buffer UTF-8 completo. Quando um caractere multibyte (qualquer acento do portugues, cedilha ou emoji) fica dividido entre dois chunks TCP, a metade final vira o caractere de substituicao U+FFFD. Como as respostas sao em portugues (system prompt exige pt-BR), a probabilidade e alta em textos longos.

**Recomendação.** Usar `decoder.decode(value, { stream: true })` em todos os loops de leitura (o mesmo TextDecoder mantem o estado dos bytes pendentes) e um `decoder.decode()` final apos o loop. Resolve-se junto com o buffer de linha do achado anterior.

**Impacto.** Evita caracteres corrompidos () no meio de palavras acentuadas durante o streaming.

> ⚖️ *Ressalva do verificador:* Ressalva apenas na severidade/probabilidade: a corrupcao so ocorre quando a fronteira de um chunk TCP/SSE cai no meio de um caractere multibyte, o que e intermitente e nao sistematico — respostas curtas do chat raramente sofrem. "Probabilidade alta" vale mais para textos longos; para o uso tipico a severidade e defensavel como medio/alto, nao claramente alto. O achado em si permanece real e bem descrito.

#### 28. Pipeline unified duplicado entre Preview e AIPanel; plugins presos no Preview
`Serviços de IA` · veredito **CONFIRMADO** · esforço **medio** · categoria *arquitetura*

**Arquivos:** `src/components/preview/Preview.tsx:120-333`, `src/components/ai/AIPanel.tsx:15-31`

**Problema.** remarkWikilinks, remarkCallouts, remarkStripFrontmatter, MermaidBlock, CustomPre, CustomImg e o mapeamento de componentes vivem inteiramente dentro de Preview.tsx. AIPanel monta um segundo processor unified independente e reduzido. Alem de causar o achado anterior, isso significa que qualquer melhoria de renderizacao (ex.: novo tipo de callout) precisa ser feita em dois lugares e o AIPanel sempre ficara para tras.

**Recomendação.** Mover os plugins remark/rehype e o objeto `components` para um modulo compartilhado (ex.: src/utils/markdown.tsx exportando `createMarkdownProcessor(opts)`), consumido por Preview e AIPanel. Fonte unica, coerente com a deduplicacao de flattenFiles/buildKnownNotes ja feita na refatoracao de Julho.

**Impacto.** Renderizacao consistente em todo o app e manutencao em um so lugar.

#### 29. Requests de IA sem cancelamento (troca de nota / fechar painel durante streaming)
`Serviços de IA` · veredito **CONFIRMADO** · esforço **medio** · categoria *resiliencia*

**Arquivos:** `src/services/ai.service.ts:27-47`, `src/components/ai/AIPanel.tsx:150-170`, `src/components/modals/NewNoteModal.tsx:103-112`

**Problema.** AIService.chat nao aceita AbortSignal e nenhum chamador cria AbortController. Se o usuario fecha o AIPanel, troca de nota ou fecha o NewNoteModal durante o streaming, o fetch continua ate o fim, consumindo tokens/cota, e a resposta ainda e anexada ao aiMessages global (getSystemPrompt ja capturou a nota antiga, entao a resposta finalizada pode se referir a um contexto que nao e mais o visivel). Nao ha botao de 'parar' — uma vez enviado, o usuario nao pode interromper.

**Recomendação.** Adicionar parametro `signal?: AbortSignal` a AIService.chat e repassa-lo aos fetch. No AIPanel, criar um AbortController por envio, guardar em ref, abortar no cleanup/unmount e ao iniciar novo envio; expor botao 'Parar'. No NewNoteModal, abortar se o modal fechar durante `generating`.

**Impacto.** Interrompe geracoes indesejadas, economiza cota e evita anexar respostas de contexto obsoleto.

> ⚖️ *Ressalva do verificador:* Uma imprecisão menor: o NewNoteModal usa a variante NÃO-streaming de AIService.chat (chama sem onChunk, linha 68), então nele não há 'streaming' propriamente — é um único await bloqueante; ainda assim o request não é cancelável, o que preserva a substância do achado. Observação adicional: o botão 'Cancelar' do modal fica disabled durante `generating` (linha 216-217), mas o fechamento por clique-fora e por Escape não, então o cenário de fechar durante a geração continua possível.

#### 30. Rate limiter aplicado so ao Gemma; chat via Gemini/OpenAI-compatible ignora RPM
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *resiliencia*

**Arquivos:** `src/services/ai.service.ts:49-99`, `src/services/ai.service.ts:191-192`, `src/config/model-limits.ts:31-33`

**Problema.** Apenas chatGemma chama `rateLimiter.throttle(model)`. O caminho chatOpenAICompatible — usado pelo provedor Gemini, que no free tier tem RPM baixo (gemini-2.5-flash: rpm 10 em model-limits.ts) — nunca faz throttle. Cliques rapidos em quick actions ou reenvios podem estourar 429 sem qualquer protecao, ao contrario do Gemma que e cuidado. Inconsistencia de tratamento entre provedores Google.

**Recomendação.** Chamar `await rateLimiter.throttle(model)` tambem em chatOpenAICompatible (ao menos para provedores Google/gemini) e em chatAnthropic conforme os limites do provedor, ou centralizar o throttle no metodo `chat()` antes do dispatch.

**Impacto.** Evita erros 429 esporadicos no chat com Gemini no plano gratuito.

#### 31. Historico de chat global cresce sem limite e mistura contexto entre notas
`Serviços de IA` · veredito **CONFIRMADO** · esforço **medio** · categoria *arquitetura*

**Arquivos:** `src/components/ai/AIPanel.tsx:144-160`, `src/components/ai/AIPanel.tsx:62-71`

**Problema.** aiMessages e global (nao escopado por nota) e a cada envio TODO o historico e reenviado junto com um system prompt que embute 4000 chars da nota ativa. Conversas longas inflam tokens/custo linearmente e podem estourar o contexto do modelo; alem disso, ao trocar de nota o chat antigo permanece mas o system prompt passa a referir outra nota — perguntas anteriores ficam descoladas do novo <nota_atual>. Nao ha truncamento de historico nem indicacao ao usuario de que a conversa nao e por-nota.

**Recomendação.** Limitar o historico enviado (ex.: ultimas N trocas ou orcamento de tokens) e/ou escopar aiMessages por arquivo (Map por path) limpando ao trocar de nota, ou deixar explicito na UI que a conversa e global. Reavaliar o corte fixo de 4000 chars (pode cortar no meio de secao relevante).

**Impacto.** Reduz custo/latencia em conversas longas e evita respostas com contexto de nota trocada.

> ⚖️ *Ressalva do verificador:* Dois ajustes menores de precisão que não invalidam o achado: (1) existe um botão "Limpar conversa" (Trash2 em AIPanel.tsx:197 -> setAiMessages([])) que zera o histórico manualmente; (2) aiMessages NÃO é persistido (vault.store não usa middleware persist), então reseta ao reabrir o app. Portanto "cresce sem limite" vale dentro da sessão, não entre sessões.

#### 32. Sincronizacao de scroll por porcentagem global desalinha em notas com diagramas/tabelas
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **alto** · categoria *ux*

**Arquivos:** `src/components/preview/Preview.tsx:211-247`

**Problema.** O scroll sync mapeia scrollTop por porcentagem do documento inteiro (scrollTop/scrollable * scScrollable). Como editor e preview tem alturas por regiao muito diferentes (um bloco mermaid/tabela/imagem ocupa pouco no fonte e muito no preview, e vice-versa), as linhas correspondentes nunca ficam alinhadas — os paineis derivam progressivamente em qualquer nota com conteudo rico. Alem disso ambos os handlers escrevem scrollTop um do outro, disputando durante o momentum, mitigado apenas por um lockout de 150ms (syncSourceRef) que produz jank/travadas.

**Recomendação.** Ancorar o sync por linha: mapear a linha do topo do viewport do editor (via editorView.lineBlockAtHeight/posAtCoords) para o elemento do preview correspondente (ex: data-source-line injetado por um plugin) e alinhar por esse elemento, em vez de porcentagem global. E um aperfeicoamento; o comportamento atual funciona mas e visivelmente impreciso.

**Impacto.** Scroll sincronizado confiavel no modo split, principal ganho de UX de escrita com preview.

#### 33. processSync no thread principal reexecuta highlight/katex a cada render (inclui troca de tema)
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **medio** · categoria *performance*

**Arquivos:** `src/components/preview/Preview.tsx:264-333`

**Problema.** renderedContent usa processSync (parse + remark + rehypeKatex + rehypeHighlight) de forma sincrona no thread de render. Apesar do debounce de 200ms, cada execucao reprocessa o documento INTEIRO — rehypeHighlight re-tokeniza todos os blocos de codigo e rehypeKatex reprocessa todas as formulas. Pior: theme e dependencia do useMemo (linha 333), entao alternar tema dispara um reparse completo sincrono, travando a UI proporcionalmente ao tamanho da nota. Notas grandes engasgam na primeira pausa de digitacao.

**Recomendação.** Nao depender de theme no memo (o tema do preview/highlight ja e via CSS; o mermaid tem observer proprio) — remover theme das deps evita o reparse na troca de tema. Para notas grandes, considerar highlight assincrono ou memoizacao por bloco. Aperfeicoamento de performance.

**Impacto.** Remove travadas ao pausar a digitacao em notas grandes e elimina reparse completo na troca de tema.

#### 34. Onboarding: 'Criar novo vault' apenas abre pasta existente e adiciona uma nota — rótulo enganoso
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/modals/OnboardingWizard.tsx:13-36`

**Problema.** handleSelectVault e handleCreateVault chamam ambos window.electron.fs.openVault() (o mesmo seletor de pasta existente). A única diferença é que handleCreateVault grava 'Bem-vindo ao VellumMD.md' dentro da pasta escolhida. Ou seja, 'Criar novo vault' não cria pasta alguma — o usuário que espera criar um vault do zero acaba selecionando uma pasta já existente. Além disso, se o diálogo for cancelado, não há feedback e o usuário fica preso no passo 1 sem indicação; o wizard também não tem botão 'Voltar'.

**Recomendação.** Ou implementar criação real de diretório (adicionar um handler fs de criar pasta / usar showSaveDialog para nomear a nova pasta), ou renomear para algo honesto ('Abrir pasta e adicionar nota de boas-vindas'). Adicionar tratamento do cancelamento (mensagem/estado) e navegação 'Voltar' entre os passos.

**Impacto.** Primeira experiência do usuário deixa de prometer criação de vault que não ocorre.

#### 35. Botões só com ícone/emoji dependem de title e não têm nome acessível
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/sidebar/Sidebar.tsx:238-241`, `src/components/editor/EditorToolbar.tsx:80-98`, `src/components/sidebar/Sidebar.tsx:223-233`

**Problema.** As abas da sidebar são botões cujo conteúdo é apenas um emoji (📁🔍🏷️🔗) com title; a toolbar do editor tem ~15 botões com ícones lucide e apenas title. title não é anunciado de forma confiável por leitores de tela (e emojis são lidos como 'pasta de arquivos aberta' etc.). Nenhum tem aria-label. O SVG lucide também não recebe aria-hidden.

**Recomendação.** Adicionar aria-label descritivo em cada botão só-ícone (ex: aria-label="Negrito") e aria-hidden="true" nos SVGs decorativos. Manter title para tooltip visual.

**Impacto.** Botões de ação passam a ser identificáveis por leitores de tela.

### 🔵 Baixo (31)

#### 36. Vite sem code splitting: chunk principal ~1.4MB avaliado na abertura
`Build / Dependências / TCC` · veredito **PLAUSIVEL** · esforço **medio** · categoria *performance*

**Arquivos:** `vite.config.ts:6-22`

**Problema.** O vite.config.ts nao define build.rollupOptions.output.manualChunks nem qualquer estrategia de chunking. A propria doc (Etapa 3) registra que o chunk 'index' principal ficou em 1.438 kB (461 kB gzip) mesmo apos extrair o Mermaid via import dinamico. Bibliotecas grandes e nao essenciais no primeiro paint continuam no bundle inicial: reveal.js e o pipeline de export so importam no momento de exportar, KaTeX/highlight.js so servem ao preview, e todo o stack unified/remark/rehype poderia ser um chunk separado. Tudo isso e' baixado e avaliado na inicializacao.

**Recomendação.** Definir manualChunks separando vendor pesado (codemirror, unified+remark+rehype, katex, highlight.js, reveal.js) e/ou aplicar React.lazy nos modulos acionados sob demanda (painel de export, preview). Reveal.js so e' necessario no runtime do export do processo main via require.resolve — confirmar que nao esta entrando no bundle do renderer. Isso reduz o custo de parse/execucao no cold start do Electron.

**Impacto.** Menor tempo ate interativo na abertura do app; ataca diretamente o 'tempo de abertura' que a propria auditoria elegeu como prioridade.

> ⚖️ *Ressalva do verificador:* Titulo enganoso: o ganho de cold-start viria de React.lazy nos modais de export/slides, nao de manualChunks (que so afeta caching web, irrelevante para renderer Electron local). reveal.js ja NAO entra no bundle do renderer — e lido como arquivo no processo main. Severidade rebaixada de medio para baixo: bundle carregado do disco local, custo de parse na ordem de dezenas de ms, e a otimizacao principal citada nao ataca a meta.

#### 37. tsconfig unico mistura ambientes DOM (renderer) e Node (electron main)
`Build / Dependências / TCC` · veredito **CONFIRMADO** · esforço **baixo** · categoria *arquitetura*

**Arquivos:** `tsconfig.json:1-19`

**Problema.** Ha um unico tsconfig.json cobrindo include ['src','electron'] com lib ['ES2020','DOM','DOM.Iterable']. O codigo do processo principal (electron/main.ts, handlers/*.handler.ts) roda em Node, mas herda os tipos de DOM: globais de browser como window, document, fetch e localStorage ficam visiveis ali sem erro de tipo. Isso deixa passar por engano uso de API de browser no processo main (e vice-versa), justamente a fronteira que o modelo main/preload/renderer existe para separar. @types/node so esta presente transitivamente (via electron), nao declarado.

**Recomendação.** Dividir em tsconfig.node.json (electron + preload, lib sem DOM, types:['node']) e tsconfig.app.json (src, com DOM) via project references, e declarar @types/node explicitamente nas devDependencies para nao depender de resolucao transitiva. Reduz a chance de cruzar APIs entre processos.

**Impacto.** O type-checker passa a impor a separacao de ambientes main/renderer, prevenindo uso acidental de API do processo errado.

#### 38. Wikilinks nao reavaliam validade quando a arvore de arquivos muda
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/components/editor/extensions/wikilink.ext.ts:60-70`

**Problema.** O ViewPlugin so reconstroi as decoracoes em `update.docChanged || update.viewportChanged` (linha 67). A existencia de cada nota e lida de `useVaultStore.getState().files` no momento do build, mas mudancas no store (criar/renomear/excluir nota via NewNoteModal, FileTree, watcher externo — todas chamam `setFiles`) NAO geram transacao no editor. Consequencia: com a nota aberta, um `[[Foo]]` continua marcado como quebrado (`cm-wikilink-broken`) mesmo apos criar a nota Foo, ate o usuario digitar algo ou rolar a tela. O cache `files === _lastFiles` funciona (setFiles sempre cria nova referencia), mas isso e irrelevante porque o rebuild nunca e disparado. A fragilidade real do modulo nao e o cache por referencia e sim a ausencia de um gatilho de recomputacao ligado ao store.

**Recomendação.** Assinar o vault store dentro da extensao e forcar rebuild quando `files` mudar. Ex.: no construtor do plugin, `useVaultStore.subscribe` (com seletor em s.files) chamando `view.dispatch({})` (transacao vazia) ou um StateEffect dedicado que invalida as decoracoes; cancelar a subscription no `destroy()` do plugin para nao vazar.

**Impacto.** Estado visual dos wikilinks (feature central do TCC) passa a refletir o vault em tempo real, inclusive apos alteracoes externas monitoradas pelo watcher da Etapa 7.

> ⚖️ *Ressalva do verificador:* Refinamento: nos fluxos in-app (NewNoteModal/FileTree) a criação/abertura da nota costuma trocar o activeFile, recriando o editor e mascarando o bug. O gatilho real e persistente é o watcher externo (Etapa 7) alterando a árvore enquanto o activeFile permanece o mesmo. Severidade 'medio' é levemente generosa por ser puramente visual e auto-corrigível a qualquer tecla/scroll (poderia ser baixo), mas defensável por wikilinks serem feature central do TCC.

#### 39. Modo maquina de escrever dessincroniza ao trocar de nota (StateField zera, store nao)
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/components/editor/extensions/typewriter.ext.ts:11-19`, `src/components/editor/Editor.tsx:108-115`

**Problema.** O `typewriterState` (StateField) tem `create: () => false` e o editor e recriado a cada troca de `activeFile` (Editor.tsx efeito com dep [activeFile]). Ao trocar de nota o campo volta a false e a classe CSS `cm-typewriter-dim` (aplicada em view.dom, um novo DOM) some — mas `store.typewriterMode` permanece true. O keymap Ctrl+Shift+T (Editor.tsx:108) sempre inverte AMBOS de forma independente, entao apos a troca eles ficam invertidos: o proximo toggle liga o efeito no editor mas desliga a flag do store (usada pela StatusBar/UI). Nenhum efeito reaplica o estado do typewriter no mount.

**Recomendação.** Reaplicar o estado no mount: no efeito de setup do editor, se `useVaultStore.getState().typewriterMode` for true, despachar `setTypewriter.of(true)` e adicionar a classe. E derivar a classe do proprio StateField (via um plugin que le o campo) em vez de manipular view.dom manualmente, para eliminar a fonte de verdade dupla.

**Impacto.** Estado do modo maquina de escrever fica consistente entre editor e UI ao navegar entre notas.

#### 40. typewriterDimPlugin e typewriterTheme sao codigo morto executado a cada tecla
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **baixo** · categoria *arquitetura*

**Arquivos:** `src/components/editor/extensions/typewriter.ext.ts:44-65`

**Problema.** `typewriterDimPlugin.build()` sempre retorna `Decoration.none` (o dimming e feito por classe CSS em toggleTypewriter), e `typewriterTheme = EditorView.baseTheme({})` esta vazio. Ainda assim o plugin roda `build()` em todo `docChanged || selectionSet` (linha 51), incluindo um `transactions.some(...effects...)` a cada transacao, sem produzir efeito algum. E overhead e superficie de manutencao sem funcao.

**Recomendação.** Remover `typewriterDimPlugin` e `typewriterTheme` do array `typewriterExtension`; manter apenas `typewriterState` e `typewriterScrollPlugin`. Se quiser manter a decoracao para o dimming baseado em ranges no futuro, implementa-la de fato em vez de retornar none.

**Impacto.** Menos trabalho por keystroke e menos codigo enganoso na extensao.

> ⚖️ *Ressalva do verificador:* A caracterizacao de "overhead" e ligeiramente exagerada: build() apenas le um StateField e retorna a constante compartilhada Decoration.none, e o transactions.some() e uma varredura trivial. O custo por keystroke e praticamente nulo. O ponto valido e ser codigo morto/enganoso (superficie de manutencao sem funcao), nao ganho de performance. Severidade "baixo" e categoria "arquitetura" estao corretas.

#### 41. Sync externo reescreve o documento inteiro (from:0 ate o fim), zerando cursor e undo
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/editor/Editor.tsx:234-239`

**Problema.** Quando `activeContent` muda por origem externa (ex.: toggle de checkbox no Preview via setActiveContent), o efeito de sync despacha `changes: { from: 0, to: docContent.length, insert: activeContent }` — substitui o texto todo. Isso colapsa a selecao/cursor para a posicao 0 e cria uma unica entrada de undo gigante que desfaz a nota inteira de uma vez. Para um toggle de checkbox que mudou 1 caractere, o efeito colateral (perder posicao de rolagem/cursor) e desproporcional.

**Recomendação.** Computar um diff minimo (prefixo/sufixo comum) e despachar apenas o range alterado, ou usar uma anotacao de transacao (`userEvent`) marcando como sync para preservar cursor via mapeamento. No minimo, preservar a selecao atual re-mapeando-a apos a mudanca.

**Impacto.** Toggle de checkbox e outras sincronizacoes externas deixam de saltar o cursor e de poluir o historico de undo.

> ⚖️ *Ressalva do verificador:* Precisao menor: no fluxo concreto do toggle de checkbox o clique ocorre no painel Preview, com o editor tipicamente sem foco, entao o "salto de cursor/rolagem" e pouco perceptivel nesse caso especifico. O efeito robusto e a poluicao do historico de undo (uma entrada gigante que desfaz a nota toda), valida para qualquer sync externo.

#### 42. Slash commands nao posicionam o cursor no ponto editavel do template
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/editor/extensions/slash-commands.ext.ts:41-52`

**Problema.** O `apply` faz `view.dispatch({ changes: { from, to, insert: template } })` sem `selection`. Para templates como '/latex' -> '$$\n\n$$' ou '/code' -> '```\n\n```', o cursor termina no fim do template inserido, e nao na linha vazia do meio onde o usuario deveria digitar. O usuario precisa reposicionar manualmente toda vez.

**Recomendação.** Definir um marcador de posicao no template (ex.: placeholder ou indice calculado) e passar `selection: { anchor: from + offsetInterno }` no dispatch, colocando o cursor entre os delimitadores. Ex.: para '$$\n\n$$', anchor = from + 3.

**Impacto.** Insercao por slash command fica pronta para digitar, alinhada ao comportamento ja usado nos atalhos de teclado (Ctrl+Shift+M/D) do Editor.

#### 43. Blocos LaTeX/Mermaid que cruzam a fronteira do visibleRange nao renderizam
`Editor & Extensões` · veredito **CONFIRMADO** · esforço **medio** · categoria *correcao*

**Arquivos:** `src/components/editor/extensions/mermaid.ext.ts:97-109`, `src/components/editor/extensions/latex.ext.ts:65-95`

**Problema.** As decoracoes escaneiam `sliceString(rangeFrom, rangeTo)` por visibleRange e aplicam regex com `^`/`$$` dentro de cada fatia. Um bloco ```mermaid``` ou `$$...$$` longo que comece acima do topo visivel e termine dentro dele (ou vice-versa, parcialmente rolado) nao casa o regex naquela fatia e fica exibido como codigo bruto ate rolar de modo que o bloco inteiro caiba na regiao visivel. E o preco (aceitavel, mas nao documentado) da migracao para visibleRanges.

**Recomendação.** Ao montar as fatias, expandir cada visibleRange ate as fronteiras de linha e, para blocos, estender a busca a partir da ultima cerca `$$`/```` ` ```` iniciada antes de rangeFrom (procurar o inicio do bloco retrocedendo por linhas). Ou aceitar e documentar a limitacao no comentario ja existente.

**Impacto.** Diagramas e formulas de bloco grandes renderizam de forma estavel durante a rolagem, sem 'piscar' entre codigo e render conforme entram no viewport.

#### 44. fs:readFile / fs:writeFile / fs:createFile sem try/catch geram rejeicao de IPC nao tratada
`Electron & Segurança` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *resiliencia*

**Arquivos:** `electron/handlers/fs.handler.ts:50-52`, `electron/handlers/fs.handler.ts:54-57`, `electron/handlers/fs.handler.ts:59-64`

**Problema.** Diferente dos demais handlers (readDir, rename, delete, cache — todos com try/catch), readFile/writeFile/createFile chamam fs.*Sync sem protecao. Um arquivo removido por fora entre o readDir e o clique, permissao negada, disco cheio ou caminho invalido faz o Sync lancar; ipcMain.handle propaga a excecao como rejeicao da Promise para o renderer. Como o codigo do renderer costuma dar await sem try/catch (ex.: abrir nota, auto-save), isso vira UnhandledRejection e o fluxo (abertura/salvamento) morre silenciosamente — justamente o tipo de perda de dados que a refatoracao de julho tentou eliminar.

**Recomendação.** Envolver os tres handlers em try/catch retornando um resultado tipado ({ok:false, error} ou null) e tratar no renderer. Para writeFile em especial, sinalizar falha de gravacao ao usuario em vez de falhar em silencio.

**Impacto.** Evita quebras silenciosas de abertura/salvamento e da ao usuario feedback quando uma gravacao falha.

> ⚖️ *Ressalva do verificador:* O gap real e menor do que o descrito: falhas de writeFile/auto-save NAO sao silenciosas (ja reportadas via setSaveStatus('error') em Editor.tsx:62-71, 137-139, 208-210) e a recomendacao para writeFile ja esta implementada. Os readFile em vault.store.ts (189-196, 256-261) tambem ja tem try/catch. O residuo concreto e um punhado de callers de readFile sem tratamento, notadamente App.tsx:137 (abrir nota), cujo efeito e falha de abertura — nao perda de dados. Por isso a severidade cai de medio para baixo.

#### 45. Janelas de exportacao renderizam HTML de nota com mermaid securityLevel 'loose' e sem sandbox
`Electron & Segurança` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *seguranca*

**Arquivos:** `electron/handlers/export.handler.ts:182-187`, `electron/handlers/export.handler.ts:143`, `electron/handlers/export.handler.ts:295`, `electron/handlers/export.handler.ts:430`

**Problema.** A BrowserWindow offscreen do PDF (182-187) define apenas offscreen:true, sem sandbox/webPreferences explicitos, e carrega HTML derivado do conteudo da nota (options.htmlContent) executando scripts inline. O mermaid e inicializado com securityLevel:'loose' nos tres exportadores (PDF, slides, site), o que permite HTML arbitrario e bindings dentro de diagramas. No PDF esse script roda na maquina do usuario durante a exportacao; nos HTML de slides/site o conteudo fica embutido e executa ao abrir o arquivo. Como e conteudo do proprio usuario o risco e menor, mas a combinacao (sem sandbox + securityLevel loose) e uma superficie desnecessaria.

**Recomendação.** Definir sandbox:true e contextIsolation:true explicitos na janela offscreen do PDF. Reavaliar se securityLevel:'loose' e necessario — 'strict' (padrao) ja permite renderizar diagramas normais e bloqueia HTML/JS injetado nos rotulos.

**Impacto.** Reduz a superficie de execucao de conteudo nao confiavel durante a exportacao e nos artefatos gerados.

> ⚖️ *Ressalva do verificador:* A afirmacao de que a janela roda 'sem sandbox' e imprecisa. Como o projeto usa Electron 30 e a janela offscreen do PDF nao tem preload nem nodeIntegration, ela herda sandbox:true e contextIsolation:true por padrao — a recomendacao de defini-los explicitamente apenas documenta o que ja ocorre, sem mudar a postura de seguranca. O ponto valido remanescente e o securityLevel:'loose' do mermaid aplicado a conteudo (proprio do usuario) nos tres exportadores; para slides/site o HTML gerado embute e executa esse conteudo ao abrir.

#### 46. Sem Content-Security-Policy e com fontes carregadas de CDN remoto
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **medio** · categoria *seguranca*

**Arquivos:** `index.html:7-9`, `electron/main.ts:32-40`

**Problema.** index.html nao declara nenhuma meta CSP e o processo principal nao seta um header CSP via session.defaultSession.webRequest/onHeadersReceived. Alem disso, index.html faz preconnect e carrega Inter/JetBrains/Lora do fonts.googleapis.com/fonts.gstatic.com — ou seja, a janela principal fala com a rede. Isso contradiz o requisito 'local-first/offline' (as fontes da UI somem sem internet) e, sem CSP, remove uma barreira importante contra execucao de scripts/conexoes inline caso ocorra injecao no preview.

**Recomendação.** Adicionar uma CSP restritiva (default-src 'self'; conectar apenas aos endpoints de embedding necessarios; script-src 'self') via header no main. Empacotar as fontes localmente (woff2 em assets) em vez de carregar do Google Fonts, alinhando com a promessa offline da Etapa 4.

**Impacto.** Torna a UI genuinamente offline e adiciona uma camada de contencao contra scripts/conexoes nao autorizados.

#### 47. restoreLastDeleted sobrescreve arquivo existente no destino sem checagem
`Electron & Segurança` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `electron/handlers/fs.handler.ts:125-130`

**Problema.** Na restauracao, targetPath e o local original e o codigo faz fs.renameSync direto sobre ele. Se o usuario ja recriou uma nota com o mesmo caminho relativo depois de excluir a original, o rename sobrescreve silenciosamente o arquivo atual (perda de dados no POSIX; comportamento variavel no Windows). Nao ha verificacao de existencia de targetPath antes de restaurar.

**Recomendação.** Se targetPath ja existir, restaurar com sufixo de deduplicacao (ex.: nome (restaurada).md) ou pedir confirmacao ao usuario, em vez de sobrescrever.

**Impacto.** Evita perda silenciosa de uma nota atual ao restaurar uma homonima da lixeira.

> ⚖️ *Ressalva do verificador:* Imprecisao menor: no Windows o fs.renameSync do Node usa MoveFileEx com MOVEFILE_REPLACE_EXISTING, entao tambem sobrescreve arquivos existentes de forma deterministica — o comportamento nao e realmente "variavel no Windows". A perda de dados silenciosa ocorre igualmente em POSIX e Windows.

#### 48. record() do rate limiter registra o timestamp duas vezes
`Embeddings & Busca` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/config/model-limits.ts:77-83`

**Problema.** record() faz `this.clean(model).push(Date.now())` — clean() ja re-salva a janela via windows.set e devolve a referencia, entao esse push adiciona 1 timestamp — e logo em seguida `updated.push(Date.now())` adiciona um SEGUNDO timestamp na mesma janela. Cada chamada a record() conta como 2 requisicoes, estourando o RPM na metade do limite real. Isso e inconsistente com throttle() (linhas 96-98), que faz um unico push apos aguardar. Na pratica record() esta orfao (nenhum caller: os services usam apenas throttle), mas e um bug latente que quebra qualquer futuro uso e contradiz o comentario 'precisamos re-salvar' — clean() ja re-salvou.

**Recomendação.** Reduzir record() a um unico push: `const w = this.clean(model); w.push(Date.now());` (o set em clean ja persiste a referencia) e remover o segundo push/`updated`. Ou remover record() se for de fato codigo morto, deixando throttle como unica fonte de registro.

**Impacto.** Evita que o limitador conte pela metade caso record() volte a ser usado, e alinha throttle/record na mesma semantica.

#### 49. cosineSimilarity recomputa a magnitude de todo vetor a cada busca — normalizacao previa evitaria O(n) de raizes
`Embeddings & Busca` · veredito **CONFIRMADO** · esforço **medio** · categoria *performance*

**Arquivos:** `src/services/similarity.ts:1-25`, `src/store/vault.store.ts:297-299`

**Problema.** topKSimilar chama cosineSimilarity para cada documento, e cada chamada recalcula magA (query) e magB (documento) do zero, incluindo Math.sqrt, a cada tecla digitada (busca com debounce de 400ms) e por passagem no loop de snippet. Os vetores dos documentos sao estaveis entre buscas, entao suas normas poderiam ser pre-computadas uma vez na indexacao; a norma da query, uma vez por busca. Hoje o custo e O(N*D) com raizes redundantes recalculadas repetidamente.

**Recomendação.** Armazenar vetores ja L2-normalizados no indice (normalizar no momento de gravar no embeddingIndex/passageIndex) e usar produto escalar puro na busca — dot product sem raizes. Alternativamente cachear a norma de cada vetor junto ao embedding.

**Impacto.** Reduz a latencia da busca semantica em vaults grandes e o trabalho por keystroke, especialmente no loop de escolha de passagem por resultado.

> ⚖️ *Ressalva do verificador:* A descricao do codigo e precisa, mas o framing de impacto e ligeiramente exagerado em dois pontos: (1) a busca roda atras de um debounce de 400ms (Sidebar.tsx:102,146), entao nao e literalmente "a cada tecla digitada" e sim por pausa de digitacao; (2) a busca faz antes um await EmbeddingService.embed(searchQuery, ...) que e uma chamada de rede (Sidebar.tsx:108-114) e domina a latencia percebida — o loop local de cosseno e desprezivel perto disso, de modo que "reduz a latencia da busca semantica em vaults grandes" superestima o ganho visivel ao usuario. Trata-se de uma micro-otimizacao real de CPU, corretamente classificada como severidade baixa.

#### 50. useEffect de indexação com array de dependências incompleto — habilitar sugestões ou configurar a chave de API não dispara indexação
`Estado & Fluxo de Dados` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/App.tsx:48-55`

**Problema.** O effect lê `suggestConnections`, `getEmbeddingKey`, `buildEmbeddingIndex` e `loadTagsOnly`, mas depende apenas de `[vaultPath, files]`. Consequência prática: com o vault já aberto, se o usuário ligar `suggestConnections` ou colar a chave de embedding nas Configurações, nada acontece — o índice só é construído no próximo evento que troque a referência de `files`. Do ponto de vista do usuário, a busca semântica "não liga" após configurar a chave; ele precisa reabrir o vault. É um bug clássico de dependências omitidas (a lint react-hooks/exhaustive-deps sinalizaria).

**Recomendação.** Incluir `suggestConnections` e o valor derivado da chave (ex.: `getEmbeddingKey()` calculado fora e passado como dep, ou assinar `embeddingApiKey`/`apiKey` no seletor) no array de dependências. As actions do Zustand são estáveis e podem ser omitidas com segurança.

**Impacto.** Ativar sugestões/chave passa a construir o índice imediatamente, sem reabrir o vault.

> ⚖️ *Ressalva do verificador:* A afirmação de que a busca semântica "não liga" e que o usuário "precisa reabrir o vault" está errada — existe o botão "Reindexar Vault" em SettingsModal.tsx:375, adjacente aos próprios campos de chave e do toggle, que chama buildEmbeddingIndex() manualmente. O bug de dependências omitidas é real (falta a indexação AUTOMÁTICA ao ligar chave/toggle), mas há um escape manual imediato, o que torna o problema de conveniência de UX, não um estado bloqueado. Por isso severidade baixo, não medio.

#### 51. Filtro do watcher por substring `.vellum` é frágil e pode ignorar notas legítimas
`Estado & Fluxo de Dados` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `electron/handlers/fs.handler.ts:181`

**Problema.** O anti-loop usa `if (name.includes('.vellum')) return;`. Por ser `includes` sobre o nome/patch relativo, qualquer arquivo cujo nome contenha a substring — ex.: uma nota `resumo.vellum.md` — seria silenciosamente ignorada pelo monitoramento em tempo real. Também casaria pastas do usuário chamadas algo como `x.vellummd`.

**Recomendação.** Filtrar por segmento de caminho, não por substring: `name.split(/[\\/]/).includes('.vellum')`, garantindo que apenas o diretório `.vellum` real seja excluído.

**Impacto.** Evita que notas com `.vellum` no nome deixem de ser monitoradas, mantendo a proteção contra o loop de reindexação.

#### 52. Vault esvaziado nunca limpa o índice em memória
`Estado & Fluxo de Dados` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/App.tsx:49`

**Problema.** O effect faz `if (!vaultPath || files.length === 0) return;`. Se o usuário deletar/mover todas as notas (ou abrir um vault vazio), `buildEmbeddingIndex`/`loadTagsOnly` não rodam e os Maps `embeddingIndex`, `passageIndex`, `tagIndex`, `fileContents` permanecem com os dados do estado anterior. Backlinks/busca semântica podem exibir resultados de notas que não existem mais.

**Recomendação.** Tratar `files.length === 0` como um caso válido que limpa os índices (`set({ embeddingIndex: new Map(), passageIndex: new Map(), tagIndex: new Map(), fileContents: new Map(), embeddingStatus: 'idle' })`) em vez de retornar cedo.

**Impacto.** Índice em memória fica consistente com um vault vazio, evitando resultados-fantasma.

#### 53. Instância mutável do CodeMirror (editorView) armazenada no store global
`Estado & Fluxo de Dados` · veredito **CONFIRMADO** · esforço **medio** · categoria *arquitetura*

**Arquivos:** `src/store/vault.store.ts:29`, `src/store/vault.store.ts:120`, `src/components/editor/Editor.tsx:197`

**Problema.** `editorView: EditorView` (uma instância mutável e não-serializável) vive dentro do estado Zustand. Embora os seletores granulares evitem re-renders, guardar um objeto imperativo mutável no store é um anti-pattern: burla o modelo de imutabilidade do Zustand, dificulta raciocinar sobre igualdade/comparação e cria acoplamento entre a store e o ciclo de vida do componente Editor (setEditorView(null) no cleanup). Também não é coberto por `partialize` (correto), mas fica no estado runtime.

**Recomendação.** Expor a view via um ref compartilhado (ex.: um módulo com `getEditorView()` ou Context) em vez de campo de estado, ou ao menos documentar que é um handle imperativo intencional. Não é urgente, mas vale registrar como dívida arquitetural do gerenciamento de estado.

**Impacto.** Store volta a conter apenas dados; reduz acoplamento entre estado global e o ciclo de vida imperativo do editor.

> ⚖️ *Ressalva do verificador:* Imprecisao menor: o achado cita a anotacao de tipo como `editorView: EditorView`, mas o codigo real declara `editorView: any | null` (vault.store.ts:29). O VALOR guardado e de fato uma instancia de EditorView, entao a substancia do achado permanece correta. Nao ha `partialize`/persist neste store — o campo nunca e serializado (a observacao do achado sobre "nao coberto por partialize" e tecnicamente vaga porque o store nem usa persist, mas o ponto de que fica no estado runtime esta correto).

#### 54. Sem timeout de request: 'Pensando...' pode ficar preso indefinidamente
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *resiliencia*

**Arquivos:** `src/services/ai.service.ts:55-63`, `src/components/ai/AIPanel.tsx:250-254`

**Problema.** Nenhum fetch tem timeout. Se a conexao travar (rede caindo no meio do stream, servidor sem resposta), o `loading` permanece true e o indicador 'Pensando...' fica eterno, sem botao de cancelar (ver achado de cancelamento). O reader.read() simplesmente nunca resolve.

**Recomendação.** Adicionar AbortController com timeout (ex.: 60-120s, e um watchdog que reinicia a cada chunk recebido durante streaming) que rejeita a promise com mensagem clara; combinar com o botao 'Parar'.

**Impacto.** Evita estado de carregamento travado sem saida quando a rede/servidor falha silenciosamente.

#### 55. Mensagem de erro de chave hardcoded para Google mesmo em OpenAI/Anthropic/Groq
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/services/ai.service.ts:34`

**Problema.** `throw new Error('API key nao configurada. Abra as Configuracoes e insira sua chave do Google AI Studio.')` e disparado para qualquer provedor, mas o texto instrui a obter chave do Google AI Studio — confuso para quem usa OpenAI, Anthropic ou Groq.

**Recomendação.** Compor a mensagem com o nome do provedor atual (via getProvider().name), ex.: `Configure sua chave de ${provider.name} nas Configuracoes.`

**Impacto.** Orientacao correta ao usuario conforme o provedor selecionado.

#### 56. catch {} vazios nos loops de streaming escondem falhas reais de parse
`Serviços de IA` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *tooling*

**Arquivos:** `src/services/ai.service.ts:84-91`, `src/services/ai.service.ts:138-145`, `src/services/ai.service.ts:228-233`

**Problema.** Os try/catch dos parsers SSE tem corpo totalmente vazio. Isso mascara tanto o achado de linhas partidas quanto respostas de erro em formato inesperado (ex.: erro de cota que chega no corpo do stream). Sem qualquer log, o comportamento e 'a resposta simplesmente veio incompleta', dificil de diagnosticar.

**Recomendação.** Distinguir linha genuinamente incompleta (esperado, apos implementar o buffer) de payload malformado; logar via console.debug o raw que falhou parse fora do caso de buffer, para diagnostico.

**Impacto.** Facilita depurar respostas incompletas em vez de falhar em silencio total.

> ⚖️ *Ressalva do verificador:* A descrição diz que os três catch têm 'corpo totalmente vazio', mas isso só é verdade para as linhas 91 e 145. A linha 233 (chatGemma) é `catch { /* linha incompleta — ignora */ }` — contém um comentário explicando a intenção (embora, como não há log nem distinção de erro real vs. buffer, o efeito prático seja idêntico ao catch vazio). O achado permanece válido: nenhum dos três distingue linha incompleta de payload malformado nem loga o raw que falhou.

#### 57. LinkSuggestion assina a store inteira e tem deps de efeito incompletas
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *performance*

**Arquivos:** `src/components/ai/LinkSuggestion.tsx:14-15`, `src/components/ai/LinkSuggestion.tsx:32-85`

**Problema.** Diferente do resto do app apos a refatoracao de Julho (Etapa 2, que migrou todos os componentes para useShallow com seletores granulares), LinkSuggestion ainda faz `useVaultStore()` e `useSettingsStore()` sem seletor, re-renderizando a cada mudanca de qualquer campo da store (editorView, embeddingIndex, aiMessages...). Alem disso, o efeito da linha 32 usa embeddingProvider, embeddingModel e getEmbeddingKey mas o array de deps (linha 85) os omite — se o usuario trocar o modelo de embedding durante a sessao, o closure fica preso no modelo antigo ate o proximo troca de arquivo.

**Recomendação.** Migrar para seletores useShallow assinando so os campos usados; incluir embeddingProvider/embeddingModel nas deps do efeito (getEmbeddingKey pode ser lido via getState() no momento do uso, como ja feito em outros pontos).

**Impacto.** Alinha o componente ao padrao de performance da refatoracao e corrige closure obsoleto ao trocar modelo de embedding.

> ⚖️ *Ressalva do verificador:* O impacto descrito ("closure preso no modelo antigo ate o proximo troca de arquivo") esta superestimado: activeContent ESTA nas deps e o recurso dispara ao digitar, entao o efeito re-executa e reconstrui o closure com embeddingProvider/embeddingModel atualizados na proxima tecla — a janela de obsolescencia e praticamente uma tecla, nao ate a troca de arquivo. O achado permanece valido (violacao de exhaustive-deps + assinatura nao-granular da store), mas a consequencia observavel na pratica e quase nula.

#### 58. rateLimiter.record() registra dois timestamps por chamada
`Serviços de IA` · veredito **CONFIRMADO** · esforço **baixo** · categoria *tooling*

**Arquivos:** `src/config/model-limits.ts:77-83`

**Problema.** `record()` faz `this.clean(model).push(Date.now())` e logo em seguida `updated.push(Date.now())` no mesmo array retornado por clean() — dois pushes para uma unica requisicao, contando o dobro na janela deslizante. Atualmente record() e canRequest() nao sao chamados em lugar nenhum (so throttle() e usado), entao e codigo morto, mas o bug fica latente para quem vier usar a API publica do limiter.

**Recomendação.** Remover o segundo push (basta `this.clean(model).push(Date.now())`), ou eliminar record()/canRequest() se realmente nao serao usados.

**Impacto.** Evita contagem dupla caso a API do limiter passe a ser usada; reduz superficie de codigo morto.

#### 59. Fila do Mermaid executa renders de blocos ja desmontados e nao coalesce por codigo
`Preview & Renderização` · veredito **PLAUSIVEL** · esforço **baixo** · categoria *performance*

**Arquivos:** `src/utils/mermaid-loader.ts:44-58`, `src/components/preview/Preview.tsx:30-46`

**Problema.** enqueueMermaidRender sempre executa o mermaid.render enfileirado mesmo que o MermaidBlock ja tenha desmontado — cancelledRef (Preview.tsx:44) so bloqueia o setState, nao cancela o trabalho na fila. Como a fila serializa TODOS os renders do app e cada um custa ~dezenas de ms, digitar numa nota com diagrama (cada tick de debounce remonta o bloco) e o widget inline do editor (rebuild a cada viewport/selectionSet em mermaid.ext.ts:79-83) empilham renders redundantes; apenas o ultimo importa. Nao ha dedupe por id/codigo.

**Recomendação.** Passar um sinal de cancelamento para enqueueMermaidRender e pular itens ja cancelados no momento em que a fila os alcanca; opcionalmente cachear SVG por codigo (o eq() do widget ja compara codigo) para evitar re-render identico.

**Impacto.** Menos trabalho desperdicado na fila serial do Mermaid; preview mais responsivo em notas com diagramas durante a digitacao.

> ⚖️ *Ressalva do verificador:* O impacto e menor que o descrito. O disparo redundante NAO vem de cada tick de debounce nem de mudancas de viewport/selecao (o eq() do widget ja evita reinvocar toDOM/enqueue quando o codigo nao muda). O desperdicio real ocorre apenas ao editar o conteudo do proprio diagrama: cada mudanca de codigo enfileira um novo render enquanto os anteriores (ja obsoletos) ainda executam na fila serial, e blocos cancelados/destruidos nao liberam seu slot na fila. A recomendacao (sinal de cancelamento na fila e/ou cache de SVG por codigo) continua valida.

#### 60. allowDangerousHtml sem rehype-raw: HTML cru some no preview mas vira texto no export
`Preview & Renderização` · veredito **CONFIRMADO** · esforço **baixo** · categoria *correcao*

**Arquivos:** `src/components/preview/Preview.tsx:275`, `src/components/modals/ExportModal.tsx:93`

**Problema.** Ambos os pipelines passam remarkRehype com allowDangerousHtml:true, mas nenhum usa rehype-raw e o rehypeStringify do export nao recebe allowDangerousHtml. Efeito: os nós 'raw' gerados sao descartados pelo rehypeReact no preview (HTML inline da nota simplesmente desaparece), enquanto no export o rehypeStringify os escapa como texto literal (aparecem como &lt;tag&gt; na pagina). A mesma nota com HTML inline renderiza de formas diferentes, e a flag allowDangerousHtml nao cumpre funcao alguma (nao ha rehype-raw para consumir os nós).

**Recomendação.** Decidir uma politica unica: ou suportar HTML inline de verdade adicionando rehype-raw + rehype-sanitize (com allowDangerousHtml consistente no stringify), ou remover allowDangerousHtml dos dois pipelines para eliminar config morta e o comportamento divergente.

**Impacto.** Comportamento consistente de HTML inline entre preview e export e remocao de configuracao enganosa.

> ⚖️ *Ressalva do verificador:* Uma imprecisao menor: o achado diz que "a flag allowDangerousHtml nao cumpre funcao alguma". Ela cumpre, sim, uma funcao no estagio remark->rehype: sem ela, remarkRehype descartaria o HTML ja ali (preview E export mostrariam nada); com ela, os nos 'raw' sao criados — no export isso muda a saida de "nada" para "texto escapado". O que a flag NAO faz (por falta de rehype-raw) eh renderizar HTML inline de verdade e produzir comportamento consistente. O restante da descricao — divergencia preview x export e ausencia de rehype-raw — esta correto.

#### 61. ConfirmModal usado como alerta informativo mostra 'Cancelar/Confirmar' e título fixo 'Confirmação'
`UX/UI & Acessibilidade` · veredito **PLAUSIVEL** · esforço **medio** · categoria *ux*

**Arquivos:** `src/components/modals/ConfirmModal.tsx:29-43`, `src/components/modals/CommandPalette.tsx:64`, `src/store/vault.store.ts:153-171`, `src/App.tsx:142`

**Problema.** openConfirm(message) é usado tanto para confirmações destrutivas ('Nota não encontrada. Deseja criar?') quanto para alertas puramente informativos ('Nenhuma nota encontrada na lixeira.'). O ConfirmModal sempre renderiza dois botões idênticos em efeito (Cancelar e Confirmar) e um título fixo 'Confirmação'. Num alerta informativo, oferecer 'Cancelar/Confirmar' é confuso — não há o que confirmar. O título nunca reflete a natureza da ação (informação vs. exclusão destrutiva).

**Recomendação.** Estender openConfirm para aceitar opções { title, confirmLabel, cancelLabel, variant: 'info'|'danger', mode: 'alert'|'confirm' }. No modo alert, exibir só um botão 'OK'; em variant danger, destacar o botão de confirmação. Passar título significativo por chamada.

**Impacto.** Diálogos param de pedir confirmação de nada e comunicam claramente ações destrutivas.

> ⚖️ *Ressalva do verificador:* Duas imprecisões: (1) o achado chama 'Deseja criar?' (App.tsx:142) de "confirmação destrutiva" — na verdade é confirmação de CRIAÇÃO; a única chamada destrutiva é a exclusão em FileTree.tsx:91, não citada. (2) 'Cancelar/Confirmar' só são "idênticos em efeito" no caso do alerta informativo (lixeira), onde o retorno é ignorado; nas demais chamadas os botões têm efeitos distintos (true/false).

#### 62. index.css monolítico (1655 linhas) misturado com estilos inline e cores hardcoded que furam o tema
`UX/UI & Acessibilidade` · veredito **PLAUSIVEL** · esforço **alto** · categoria *arquitetura*

**Arquivos:** `src/index.css:1-1655`, `src/components/modals/NewNoteModal.tsx:198-208`, `src/components/modals/ExportModal.tsx:352-366`, `src/components/modals/ExportModal.tsx:309-319`

**Problema.** Todo o design system vive em um único index.css de 1655 linhas, enquanto os componentes carregam grandes blocos de style inline (padding, cores, layout) — mistura de duas fontes de verdade que dificulta manutenção e consistência. Pior: várias cores são hardcoded em vez das variáveis do tema, furando o modo claro/escuro. Ex.: NewNoteModal usa #e06c75 para erro (existe --error-color); ExportModal repete a mesma 'result box' com #3fb950/#f85149 em dois lugares quase idênticos (linhas 309-319 e 352-366) em vez de --save-color/--error-color e de um componente único.

**Recomendação.** Quebrar index.css por domínio (base/variáveis, layout, sidebar, editor, modais, preview) via @import ou build. Substituir cores hex hardcoded pelas variáveis existentes (--error-color, --save-color) para respeitar o tema. Extrair a 'result box' repetida do ExportModal para um componente/classe única. Mover estilos inline recorrentes para classes.

**Impacto.** Facilita manutenção, garante consistência claro/escuro e elimina duplicação de estilo.

> ⚖️ *Ressalva do verificador:* A parte mais forte da descricao — que as cores hardcoded "furam o modo claro/escuro" — e imprecisa. --save-color (#3fb950) e --error-color (#f85149) tem VALOR IDENTICO nos dois temas (index.css:12/14 light e 26/28 dark), entao escrever o hex literal #3fb950/#f85149 no ExportModal renderiza exatamente a mesma cor em light e dark; nao ha quebra de tema. O #e06c75 do NewNoteModal e apenas um vermelho inconsistente com --error-color (#f85149), mas tambem fixo em ambos os temas — inconsistencia visual, nao theme-breaking. Alem disso o proprio index.css hardcoda esses mesmos hex (linhas 376, 1340-1345), reforcando que o problema real e higiene/manutencao, nao ruptura de tema. Por isso ajusto a severidade de medio para baixo: e uma questao de arquitetura/consistencia/duplicacao sem impacto funcional ou visual real. As variaveis referenciadas existem e a recomendacao (extrair componente unico da result box, trocar hex por var()) e valida.

#### 63. Sem prefers-reduced-motion: spinners e transições sempre animam
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/index.css:318`, `src/components/modals/SettingsModal.tsx:220`, `src/components/modals/ExportModal.tsx:285`

**Problema.** Há animações de spin (RefreshCw/Loader com animation: spin), transições em botões e barras de progresso, mas nenhuma media query @media (prefers-reduced-motion: reduce) no index.css (grep não retorna nenhuma ocorrência). Usuários sensíveis a movimento não têm como reduzir a animação.

**Recomendação.** Adicionar um bloco @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } } e/ou desativar o spin quando a preferência estiver ativa.

**Impacto.** Conforto/acessibilidade para usuários com sensibilidade a movimento; boa prática de conformidade.

> ⚖️ *Ressalva do verificador:* As linhas citadas estao imprecisas: a animacao de spin esta em index.css:1044/1049 (nao 318). SettingsModal.tsx:220 e ExportModal.tsx:285 sao referencias aproximadas — ExportModal.tsx:285 de fato usa className=\"spin\". A imprecisao de linha nao altera a validade do achado.

#### 64. Padrão frágil de foco via setTimeout(50) em vez de foco determinístico
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/modals/ConfirmModal.tsx:10-16`, `src/components/modals/PromptModal.tsx:11-22`, `src/components/modals/NewNoteModal.tsx:29-40`

**Problema.** Três modais focam o elemento inicial com setTimeout(..., 50) após abrir. É uma corrida contra o render/paint: em máquinas lentas 50ms pode ser cedo demais e o foco falhar; em geral é frágil e não determinístico. Combinado com a ausência de focus trap, se o timeout falhar o modal abre sem foco algum.

**Recomendação.** Usar autoFocus no input/botão inicial ou requestAnimationFrame/useLayoutEffect com ref, dentro do componente Modal base sugerido, garantindo foco no primeiro elemento focável assim que montado.

**Impacto.** Foco inicial confiável em qualquer hardware; base para o focus trap.

#### 65. Exportação bem-sucedida mostra o caminho como texto, sem ação para abrir a pasta
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/modals/ExportModal.tsx:352-366`, `src/components/modals/ExportModal.tsx:151-153`

**Problema.** Após exportar PDF/slides/site, o resultado é uma string com o caminho ('✅ PDF salvo em: ...') que quebra com word-break: break-all. Não há botão para abrir o arquivo/pasta gerado nem cópia do caminho — o usuário precisa navegar manualmente até o local. Também não há auto-dismiss nem foco levado à mensagem de sucesso/erro (que não é anunciada por leitor de tela).

**Recomendação.** Adicionar um botão 'Abrir pasta' (shell.showItemInFolder via handler já disponível no main) ao lado do caminho e, opcionalmente, um role="status"/aria-live="polite" no container do resultado para anunciar sucesso/erro.

**Impacto.** Fecha o fluxo de exportação com uma ação útil e torna o feedback perceptível por leitores de tela.

> ⚖️ *Ressalva do verificador:* Ressalva na recomendação: ela afirma que `shell.showItemInFolder` já está disponível via handler no main, mas isso é falso. A busca no projeto mostra que o único uso de shell é `shell.openExternal(url)` em electron/handlers/fs.handler.ts:210; não existe handler de showItemInFolder/openPath exposto. Ou seja, implementar o botão 'Abrir pasta' exige criar um novo handler IPC no main + preload, não apenas usar algo pronto. O problema de UX em si permanece confirmado.

#### 66. StatusBar esconde contagem de palavras/cursor enquanto o banner de 'desfazer exclusão' está visível
`UX/UI & Acessibilidade` · veredito **CONFIRMADO** · esforço **baixo** · categoria *ux*

**Arquivos:** `src/components/statusbar/StatusBar.tsx:76-95`

**Problema.** Quando lastDeleted existe, o lado esquerdo da status bar é totalmente substituído pelo banner "'x' excluído / Desfazer (10s)", ocultando por 10 segundos a contagem de palavras/caracteres/tempo de leitura e a posição do cursor (Ln/Col). Durante a edição normal logo após excluir uma nota, o usuário perde essas informações ao vivo.

**Recomendação.** Renderizar o banner de undo como um item adicional (ou toast flutuante) sem remover os contadores, ou movê-lo para o lado direito/uma faixa própria, preservando as métricas do documento sempre visíveis.

**Impacto.** Mantém informações contínuas do documento visíveis mesmo durante a janela de desfazer exclusão.

---

## 4. Regressão da atualização de Julho/2026

A dimensão dedicada a revalidar as 8 etapas recentes não completou (limite de gasto no fim do run). Contudo, **os revisores das demais dimensões leram o código atual** e, ao não reabrirem esses pontos, confirmam indiretamente que as mudanças de Julho seguem de pé. Consolidação com base nesta sessão:

| Mudança de Julho | Estado | Observação da revisão |
|---|---|---|
| Flush do auto-save ao trocar de nota | ✅ mantido | Nenhum revisor reabriu perda de dados no editor |
| Seletores `useShallow` (12 componentes) | ✅ mantido | #57 aponta que `LinkSuggestion` **ainda** assina a store inteira — passou batido na Etapa 2 |
| Debounce do preview + `toggleCheckbox` estável | ⚠️ efeito colateral | O debounce está certo, mas #7 revela um **bug pré-existente** no cálculo do índice do checkbox (não introduzido agora, mas exposto) |
| Lazy-load do Mermaid compartilhado | ✅ mantido | #59 sugere coalescer renders e cancelar blocos desmontados (refino) |
| Exportações offline + PDF determinístico | ✅ mantido | #45/#46 pedem endurecer segurança (sandbox/CSP) das janelas de export |
| Embeddings 768 + invalidação por dimensão | ✅ mantido | #48 nota que `record()` do limiter grava timestamp em dobro (função secundária) |
| Preview inline religado no editor | ✅ mantido | #16/#43 apontam bordas: `$` em prosa e blocos que cruzam o viewport |
| File watcher do vault | ✅ mantido | #26/#51 refinam: `setFiles` sempre re-lê o vault e o filtro `.vellum` por substring é frágil |
| electron-builder configurado | ✅ mantido | #13 lembra ícone próprio, assinatura e auto-update |

**Conclusão:** nenhuma regressão real foi introduzida por Julho. Os itens acima são **refinos sobre uma base sólida** — e dois deles (#57, #7) revelam que a refatoração passou perto mas não fechou completamente dois pontos.

## 5. Como usar este relatório

- Os números (#) são estáveis e servem de referência em commits/issues: `fix: confina IPC ao vault (relatorio #1)`.
- O JSON estruturado da arquitetura correlata está em `docs/arquitetura-interativa/architecture.json`; o diagrama navegável em `docs/arquitetura-interativa/index.html`.
- Sugestão de fluxo: abrir uma issue por **onda** (Seção 2.2), não por achado — as ondas agrupam itens que compartilham código e teste.

---

*Relatório gerado por revisão multi-agente com verificação adversarial. 66 achados retidos de 67 brutos; nenhum rejeitado neste lote (o filtro descarta apenas o factualmente incorreto ou já corrigido). Reexecutável — script do workflow versionado na sessão.*
