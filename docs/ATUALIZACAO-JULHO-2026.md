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

*(as demais etapas são documentadas abaixo conforme implementadas)*
