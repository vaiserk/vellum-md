# Análise de Implementação e Plano de Ação — VellumMD

Após uma análise completa do projeto atual em relação à especificação original (`VellumMD_SPEC_PROMPT.md`), compilei o status detalhado de todas as funcionalidades e criei um roteiro para implementarmos o que falta.

## 1. Status da Implementação

### ✅ O que foi **totalmente implementado**
*   **Core e Arquitetura:** Setup base com Vite, Electron, React e Zustand. Sistema local de leitura e gravação de arquivos via IPC (`fs.handler.ts`).
*   **Editor Markdown:** CodeMirror 6 funcional com GFM, slash commands (`/`), autocomplete para wikilinks (`[[ ]]`), Typewriter Mode, toolbar de formatação e auto-save.
*   **Pipeline de Preview:** Renderização unificada (unified, remark, rehype) suportando tabelas, LaTeX (KaTeX), code highlighting e callouts (`> [!NOTE]`).
*   **IA e Assistência (Chat):** Painel lateral de IA (`AIPanel.tsx`) funcional, com contexto da nota atual, ações rápidas e suporte a múltiplos provedores configuráveis.
*   **Exportação Avançada:** Geração de PDF via motor do Electron, Site Estático de todo o vault e Slides (Reveal.js) integrados com Mermaid e KaTeX.
*   **UI/UX:** Temas (Dark/Light), Command Palette (`Ctrl+P`), barra de status, modal de configurações e onboarding.

### ⚠️ O que foi **alterado/adaptado** (Mudanças de Implementação)
*   **Exportação de Slides:** Em vez de forçar o usuário a poluir a nota original com `---`, implementamos um **Editor de Slides dedicado** (`SlideEditorModal.tsx`) que trabalha em uma cópia da nota em tempo real, preservando o documento original limpo. O frontmatter também é automaticamente limpo da geração dos slides.

### ❌ O que **NÃO foi implementado** (Faltante)

1.  **Busca Semântica e Embeddings (Core IA)**
    *   Falta o `embedding.service.ts` para gerar embeddings locais em background.
    *   Falta o algoritmo de *Cosine Similarity* (`semantic-search.ts`).
    *   A interface de busca atual na Sidebar realiza apenas um filtro textual pelo nome do arquivo.
    *   Falta o sistema de "Sugestão de Conexões" (`LinkSuggestion.tsx`) que notifica via toast quando há notas relacionadas ao texto recém-digitado.
2.  **Extensões de Preview Inline no Editor**
    *   A visualização do LaTeX e Mermaid hoje ocorre apenas no painel lateral de Preview.
    *   A especificação pede **Inline Preview** diretamente no CodeMirror: ao tirar o foco de blocos `$...$` ou ` ```mermaid `, eles devem se transformar em widgets SVG ou Math dentro do editor.
3.  **Sincronização de Scroll (Scroll Sync)**
    *   O scroll bidirecional entre o CodeMirror (Editor) e o painel de renderização (Preview) não foi implementado.
4.  **Integração Profunda de IA no Editor**
    *   Menu de contexto (clique direito) no texto selecionado do editor para disparar prompts da IA (ex: "Reescrever seleção", "Explicar").
5.  **Refinamento do Vault/Sidebar**
    *   A aba "Tags" na sidebar está populando os "chips" usando o nome do arquivo em vez de parsear a key `tags: []` do frontmatter YAML.

---

## 2. Novo Plano de Implementação

Para finalizar a especificação com máxima qualidade, proponho a seguinte ordem de desenvolvimento. O objetivo é começar pela arquitetura mais complexa (Embeddings) e terminar com os polimentos de UX.

### Fase 1: Motor Semântico e Conexões
*   **Objetivo:** Implementar o "segundo cérebro" habilitando busca por significado.
*   **Tarefas:**
    1.  Criar `embedding.service.ts` para gerenciar chamadas à API de embeddings (`text-embedding-3-small` da OpenAI ou modelo configurado).
    2.  Criar sistema de indexação em background no store/worker que varra as notas, extraia os textos limpos (removendo markdown tags) e salve em cache local `.vellum/embeddings.json`.
    3.  Implementar `similarity.ts` com a função de Cosine Similarity.
    4.  Atualizar a aba de busca na `Sidebar.tsx` para incluir um toggle de busca Lexical/Semântica.
    5.  Implementar o `LinkSuggestion.tsx` (toast de recomendação de wikilinks ao parar de digitar).

### Fase 2: Experiência do Editor (Inline Previews & Scroll Sync)
*   **Objetivo:** Reduzir a dependência do painel de Preview, trazendo os diagramas e a matemática para dentro do fluxo de escrita.
*   **Tarefas:**
    1.  Criar `latex.ext.ts`: CodeMirror ViewPlugin e WidgetType que detecta nós de Math (`InlineMath`, `BlockMath`) e renderiza usando KaTeX com `Decoration.replace` quando a linha perde o foco.
    2.  Criar `mermaid.ext.ts`: Similar ao LaTeX, mas capturando nós CodeBlock com a linguagem `mermaid`.
    3.  Implementar a lógica de *Scroll Sync* no `Preview.tsx` conectada ao evento de rolagem do `Editor.tsx`.

### Fase 3: IA Contextual e Refinamentos de UI
*   **Objetivo:** Aprimorar a interação com o texto e o gerenciamento de metadados.
*   **Tarefas:**
    1.  Criar a extensão de CodeMirror para interceptar o menu de contexto do navegador no texto selecionado, substituindo por um menu flutuante do VellumMD (Reescrever, Explicar, Traduzir).
    2.  Refatorar a extração de metadados: usar um parser YAML nativo para popular a aba de "Tags" da Sidebar com dados reais do frontmatter de todas as notas do vault.
    3.  Revisão geral de atalhos e polimentos estéticos nas tooltips.

---

**Você nos dá autorização para começar a codificar a Fase 1 (Busca Semântica e Conexões)?**
