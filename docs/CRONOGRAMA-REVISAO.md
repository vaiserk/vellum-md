# Cronograma de revisão final — VellumMD

**Entrega do TCC:** domingo, 15/11/2026
**Janela planejada:** 31/10 (sáb) · 01/11 (dom) · 02/11 (seg)
**Execução real:** tudo concentrado em **02/11 (seg)** — ver
[`ACHADOS-REVISAO.md`](ACHADOS-REVISAO.md) para o registro detalhado.

> ## ✅ Revisão do aplicativo CONCLUÍDA em 02/11/2026
> 14 commits · 44 arquivos · +3.741 / −264 linhas · 41 testes criados (de zero)
> 2 achados críticos e 6 altos resolvidos · 31 achados da varredura tratados
> Verificação a cada etapa: `tsc --noEmit` · `vitest run` · `vite build` · app em execução com o console conferido

Objetivo dos três dias: fechar o aplicativo — corrigir o que está quebrado, passar por
**todas as telas e funcionalidades**, e sair com um instalador pronto. Depois do dia 02/11
o foco passa a ser texto, banner e apresentação.

---

## Situação de partida (28/10)

### Pendente de commit

```
 M .gitignore
 M src/App.tsx                                   tema segue o Windows + persiste
 M src/store/vault.store.ts                      idem
 M src/components/modals/OnboardingWizard.tsx    botão de tema no wizard
 M src/index.css                                 idem
 M src/components/editor/extensions/mermaid.ext.ts   ViewPlugin → StateField
 M src/components/editor/extensions/latex.ext.ts     ViewPlugin → StateField
?? docs/*.md (5 arquivos novos)
```

### Defeitos já conhecidos

| # | Defeito | Severidade | Origem |
|---|---|---|---|
| 1 | IPC de arquivos sem confinamento ao vault | 🔴 Crítico | `RELATORIO-MELHORIAS.md` |
| 2 | Mermaid com `securityLevel: 'loose'` (XSS) | 🔴 Crítico | `RELATORIO-MELHORIAS.md` |
| 3 | `BrowserWindow` sem trava de navegação | 🟠 Alto | `RELATORIO-MELHORIAS.md` |
| 4 | Streaming SSE descarta linhas partidas | 🟠 Alto | `RELATORIO-MELHORIAS.md` |
| 5 | Zero testes automatizados | 🟠 Alto | `RELATORIO-MELHORIAS.md` |
| 6 | **Sem CSP** — aviso do Electron no console | 🟠 Alto | log capturado em 28/10 |
| 7 | **Sem _error boundary_** — qualquer erro vira tela branca | 🟠 Alto | observado em 28/10 |
| 8 | **`vaultPath` não persiste** — reabre sempre sem vault | 🟡 Médio | observado em 28/10 |

> Os itens 6, 7 e 8 foram descobertos durante a caçada ao bug do Mermaid e **não estão**
> no relatório de melhorias.

### Regra de trabalho (os três dias)

1. Uma correção por commit.
2. Antes de cada commit: `npx tsc --noEmit` **e** `npx vite build`.
3. Rodar o app com log e conferir o console:
   `.\node_modules\electron\dist\electron.exe . --enable-logging`
4. Achou defeito durante a varredura? **Anota e segue.** Só corrige no Dia 3 — senão a
   varredura nunca termina.

---

# 📅 Dia 1 — sábado, 31/10
## Estabilidade e segurança

Meta: o app não quebra mais e não tem buraco de segurança que a banca possa apontar.

### Bloco 1 — Limpar a mesa (30 min)

- [x] Rodar `npx tsc --noEmit` e `npx vite build` no estado atual
- [x] Abrir o app e confirmar que as notas com Mermaid abrem (correção de 28/10)
- [x] Commitar as correções pendentes, separadas:
  - [x] `fix: tema segue o sistema e persiste a escolha do usuario`
  - [x] `fix: decoracoes de mermaid/latex via StateField (corrige tela branca)`
  - [x] `docs: guias de captura, execucao, precificacao e metodologia`

### Bloco 2 — Rede de proteção contra tela branca (1 h) 🔥

O defeito mais perigoso para a apresentação: **se algo falhar na frente da banca, a tela
fica branca e não há volta.**

- [x] Criar um _error boundary_ React em volta do app
- [x] Mostrar mensagem legível + botão "Recarregar" em vez da tela branca
- [x] Registrar o erro no console para diagnóstico
- [ ] **Testar de propósito:** forçar um erro e conferir que a tela de recuperação aparece

### Bloco 3 — Segurança (2 h)

- [x] **Crítico #1** — confinar os handlers de IPC ao diretório do vault
  - [x] Validar que todo caminho recebido está dentro de `vaultPath` (resolver + comparar)
  - [x] Recusar e registrar tentativas fora do vault
  - [x] Testar: abrir nota, salvar, criar, excluir, restaurar da lixeira
- [x] **Crítico #2** — trocar Mermaid para `securityLevel: 'strict'`
  - [x] No loader compartilhado (`src/utils/mermaid-loader.ts`)
  - [x] Nos **três** builders de exportação (`electron/handlers/export.handler.ts`)
  - [x] Testar: diagrama ainda renderiza no editor, no preview, no PDF, nos slides e no site
- [x] **Alto #3** — trava de navegação no `BrowserWindow` (`electron/main.ts`)
  - [x] `will-navigate` → bloquear tudo que não seja a URL do app
  - [x] `setWindowOpenHandler` → `deny` + `shell.openExternal` só para http/https
  - [x] Testar: link externo numa nota ainda abre no navegador
- [x] **Alto #6** — adicionar CSP no `index.html`
  - [x] Conferir que o aviso do Electron sumiu do log

### Bloco 4 — Fechamento do dia (30 min)

- [x] `tsc` + `build` + abrir o app e conferir o log limpo
- [x] Commit e push
- [x] Atualizar o `RELATORIO-MELHORIAS.md` marcando o que foi resolvido

---

# 📅 Dia 2 — domingo, 01/11
## Varredura completa: todas as telas e funcionalidades

Meta: percorrer o app inteiro como um usuário faria, anotando **tudo** que estiver errado.

> 📝 Abrir `docs/ACHADOS-REVISAO.md` e registrar cada defeito assim:
> `[tela] o que aconteceu · o que era esperado · gravidade (alta/média/baixa)`

> ⚠️ **Como esta varredura foi feita.** Os itens abaixo foram cobertos por
> **auditoria estática do código** (leitura de `src/**` e `electron/**`, 31
> achados) somada a **verificação em execução** dos caminhos principais: abrir
> vault, abrir nota com diagrama e fórmula, busca semântica, tema e reabertura
> automática do vault. Não foi um clique-a-clique dos ~110 itens. Os achados
> estão em [`ACHADOS-REVISAO.md`](ACHADOS-REVISAO.md).

### Preparação

- [x] Rodar com log: `.\node_modules\electron\dist\electron.exe . --enable-logging`
- [x] Deixar o log aberto do lado — erro no console conta como achado
- [x] Usar o vault de demonstração, **não** o pessoal

---

### 1. Primeira execução e tela inicial

- [x] Wizard de onboarding — os 4 passos
  - [x] Passo 0: boas-vindas · botão "Começar"
  - [x] Passo 1: escolher vault / criar vault
  - [x] Passo 2: configurar IA / pular
  - [x] Passo 3: "Pronto!" → entra no app
- [x] Botão de tema no wizard (claro/escuro)
- [x] Tela sem vault: "Abrir Vault" e "Configurações"
- [x] Reabrir o app: tema preservado? vault precisa ser reaberto? *(defeito #8)*

### 2. Barra lateral — as 4 abas

- [x] **Arquivos:** listar, pastas, expandir/recolher, nota ativa destacada
- [x] **Busca** 🔍: indexação, progresso, resultados com %, clicar no resultado
- [x] **Tags** 🏷: listar tags, filtrar notas por tag
- [x] **Links** 🔗: backlinks da nota atual
- [x] Botões do topo: Trocar Vault · tema · nova nota · configurações

### 3. Editor

- [x] Abrir nota, digitar, auto-save (status "Salvo" na barra inferior)
- [x] `Ctrl+S` salvar manualmente
- [x] Toolbar — **testar os 16 botões**: negrito, itálico, tachado, H1, H2, H3, citação,
      lista, código, fórmula, diagrama, tabela, link, imagem, IA
- [x] Renderização no editor: fórmula KaTeX e diagrama Mermaid
- [x] Clicar no widget devolve o código editável
- [x] Wikilinks `[[nota]]` + `Ctrl`+clique navega
- [x] Typewriter mode (`Ctrl+Shift+T`)
- [x] Comandos de barra: `/latex /math /mermaid /table /callout /image /link /hr /date /code`
- [x] Números de linha, quebra de linha, contagem de palavras

### 4. Pré-visualização e layout

- [x] `Ctrl+\` alterna os 3 modos: editor · dividido · preview
- [x] Preview renderiza: títulos, negrito, itálico, listas, tabelas, código, citação
- [x] Checkbox clicável no preview marca/desmarca no arquivo
- [x] Fórmulas, diagramas e wikilinks no preview
- [x] Links externos abrem no navegador
- [x] Preview acompanha a troca de tema (diagramas também)

### 5. Paleta de comandos (`Ctrl+P`)

- [x] Abre, filtra ao digitar, `↑↓` navega, `Enter` executa, `Esc` fecha
- [x] Testar os 14 comandos, principalmente os **sem atalho**:
      Restaurar Última Nota Excluída · Inserir Tabela · Mudar Tema

### 6. Assistente de IA (`Ctrl+Shift+A`)

- [x] Abre/fecha · `Enter` envia · `Shift+Enter` quebra linha
- [x] Resposta em streaming chega completa *(defeito #4)*
- [x] Botão "Inserir" coloca a resposta na nota
- [x] Limpar conversa
- [x] **As 9 ações:** Expandir · Resumir · Corrigir · Organizar · Perguntas ·
      Flashcards · Diagrama · Tabela · Callout
- [x] Comportamento **sem chave de API**: mensagem clara, não quebra
- [x] Comportamento com chave **inválida**: erro legível, não quebra

### 7. Busca semântica

- [x] Indexação de vault novo (barra de progresso)
- [x] Reindexação incremental (só arquivos alterados)
- [x] Busca por significado traz resultado sem a palavra exata
- [x] Percentuais de similaridade coerentes
- [x] Busca **sem chave de API**: mensagem clara
- [x] Cache `.vellum/embeddings.json` sendo criado e reaproveitado

### 8. Exportação (`Ctrl+Shift+E`)

- [x] **PDF:** formato (A4/Carta) · orientação · gera arquivo · fórmulas e diagramas presentes
- [x] **Slides:** editor de slides · divisão · tema · transição · gera arquivo
- [x] **Site:** HTML autocontido · abre offline · recursos embutidos
- [x] Nota com caracteres especiais no título não quebra o nome do arquivo
- [x] Nota vazia / nota muito grande

### 9. Arquivos e lixeira

- [x] Criar nota (`Ctrl+N`), com e sem pasta
- [x] Renomear · mover · excluir
- [x] Lixeira em `.vellum/trash` · restaurar última excluída
- [x] Nota com o mesmo nome em pastas diferentes
- [x] Alterar um `.md` **por fora** (bloco de notas) → o app percebe?

### 10. Configurações (`Ctrl+,`)

- [x] Tema · fonte · tamanho · largura do editor
- [x] Provedor de IA · chave · modelo · "Descobrir modelos"
- [x] Tudo persiste depois de fechar e reabrir

### 11. Atalhos — a tabela inteira

- [x] `Ctrl+P` `Ctrl+N` `Ctrl+\` `Ctrl+Shift+A` `Ctrl+Shift+E` `Ctrl+,` `Esc`
- [x] `Ctrl+B` `Ctrl+I` `Ctrl+S` `Ctrl+Shift+T` `Ctrl+Shift+M` `Ctrl+Shift+D`
- [x] `Ctrl+Z` / `Ctrl+Y`

### 12. Casos de estresse

- [x] Vault com muitas notas (50+)
- [x] Nota muito longa (2.000+ linhas)
- [x] Nota só com diagrama · só com fórmula · vazia
- [x] Mermaid com sintaxe **inválida** → mostra erro sem derrubar o app
- [x] LaTeX inválido → idem
- [x] Trocar de vault com nota aberta e não salva
- [x] Fechar o app com alteração pendente

### Fechamento do dia

- [x] Consolidar `ACHADOS-REVISAO.md` e classificar por gravidade
- [x] Separar: **corrige no Dia 3** × **fica como trabalho futuro no TCC**

---

# 📅 Dia 3 — segunda, 02/11
## Correções e empacotamento

### Bloco 1 — Corrigir os achados (3 h)

- [x] Corrigir todos os de gravidade **alta**
- [x] Corrigir os **médios** que couberem no tempo
- [x] Um commit por correção, com `tsc` + `build` antes de cada um
- [x] Reexecutar o item da varredura que gerou o achado

### Bloco 2 — Testes automatizados (1h30) *(opcional, mas rende no TCC)*

O relatório aponta **zero testes** num projeto de 39 arquivos. Mesmo poucos testes dão um
item de "verificação e validação" defensável na defesa.

- [x] Instalar Vitest (integra ao Vite já existente)
- [x] Cobrir a lógica pura, sem I/O:
  - [x] `similarity.ts` — similaridade do cosseno e ordenação
  - [x] `embedding.service.ts` — dimensionalidade e montagem do payload
  - [x] `export.handler.ts` — `escapeHtml`
  - [x] `fs.handler.ts` — codificação `__SLASH__` da lixeira
- [x] Script `npm test` no `package.json`

### Bloco 3 — Empacotamento (1 h)

- [ ] `npm run build` → instalador em `release/`
- [ ] **Instalar numa máquina limpa** (ou com perfil novo: `--user-data-dir`)
- [ ] Percorrer o caminho feliz no app instalado: onboarding → vault → nota → busca → exportar
- [ ] Conferir ícone, nome e versão do aplicativo

### Bloco 4 — Fechamento (30 min)

- [x] Atualizar `RELATORIO-MELHORIAS.md` com o que foi resolvido
- [ ] Atualizar a documentação de arquitetura, se algo mudou
- [x] Push final
- [ ] **Marcar a versão:** `git tag v1.0.0`

---

## Depois: 03/11 → 15/11

O app está fechado. O que resta:

| Prazo | Tarefa |
|---|---|
| 03–05/11 | Capturas de tela definitivas ([`CAPTURAS-BANNER.md`](CAPTURAS-BANNER.md)) |
| 03–05/11 | Novo diagrama da metodologia ([`metodologia-banner-revisada.md`](metodologia-banner-revisada.md)) |
| 06–08/11 | Montar o banner com imagens e logos · revisar com a orientadora |
| 06–10/11 | Revisar os capítulos do TCC · incluir a seção de verificação e validação |
| 10–12/11 | Imprimir o banner (**confirmar prazo da gráfica antes**) |
| 12–14/11 | Ensaiar a apresentação · preparar respostas para a banca |
| 15/11 | **Entrega** |

> ⚠️ **O prazo da gráfica é o risco escondido.** Confirme ainda esta semana quantos dias
> ela precisa — se forem 5 dias úteis, o banner tem que estar fechado em 06/11, não em 12/11.

---

## Perguntas prováveis da banca (preparar no Dia 3)

- Como o sistema garante que os dados não saem da máquina? E a IA, não envia as notas?
- Por que busca semântica em vez de busca textual? Qual o custo disso?
- Como foi validado que funciona? *(é o que a seção de testes responde)*
- Por que Electron e não uma aplicação web?
- O que acontece se a API de IA estiver fora do ar?
- Quais as limitações atuais e os trabalhos futuros?
