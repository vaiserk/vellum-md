# Registro da revisão final — 02/11/2026

Registro do que foi examinado, corrigido e deixado de fora na revisão geral do
aplicativo. Complementa o [`RELATORIO-MELHORIAS.md`](RELATORIO-MELHORIAS.md)
(auditoria anterior, 66 achados) e o [`CRONOGRAMA-REVISAO.md`](CRONOGRAMA-REVISAO.md).

**Resultado em números:** 14 commits · 44 arquivos · +3.741 / −264 linhas ·
41 testes automatizados criados (de zero) · 2 achados críticos e 6 altos resolvidos.

**Verificação ao final de cada etapa:** `npx tsc --noEmit` (exit 0),
`npx vitest run` (41/41), `npx vite build` e execução real do app com
`--enable-logging`, conferindo o console.

---

## 1. Correções de segurança

| # | Achado | Origem | Commit |
|---|---|---|---|
| 1 | 🔴 IPC de arquivos sem confinamento ao vault | Relatório #1 | `7242e94` |
| 2 | 🔴 Mermaid com `securityLevel: 'loose'` (XSS) | Relatório #2 | `1d83bc8` |
| 3 | 🟠 `BrowserWindow` sem trava de navegação | Relatório #4 | `2c4a5dd` |
| 4 | 🟠 Ausência de Content-Security-Policy | Novo (log do Electron) | `bcf5231` |
| 5 | 🔴 **Path traversal no restaurar da lixeira** | **Novo, achado hoje** | `7242e94` |

**Sobre o #5:** o nome do arquivo na lixeira é decodificado em caminho relativo
para restaurar a nota no local original. Um nome contendo `..` escaparia do
vault e gravaria em qualquer lugar do disco. Não estava no relatório anterior.

**Sobre o #1:** a correção trocou o modelo de confiança. Antes, o renderer
informava o caminho do vault a cada chamada. Agora o **processo principal é a
única fonte da verdade**: `vaultRoot` só é definido quando o usuário escolhe a
pasta no diálogo do sistema, e todo handler valida o alvo com `path.relative`
antes de tocar no disco. Os argumentos `vaultPath` vindos do renderer passaram a
ser ignorados.

**Efeito colateral desejado:** como o caminho passou a ser guardado em
`userData` pelo processo principal, o vault voltou a reabrir automaticamente —
o que antes não acontecia (o `vaultPath` não era persistido).

---

## 2. Perda de dados

Cinco casos, todos reproduzíveis, nenhum no relatório anterior.

| # | Problema | Sintoma | Commit |
|---|---|---|---|
| 6 | Fechar a janela descartava a última edição | O auto-save é *debounced* e fechar o app não desmonta o React: o flush do cleanup nunca rodava e o timeout era descartado | `ddd29e4` |
| 7 | Trocar de vault não limpava nada | A nota antiga seguia aberta e **o auto-save continuava gravando nela** — o usuário pensava estar escrevendo no vault novo | `ddd29e4` |
| 8 | Editor gravava em qualquer arquivo ativo | Com uma imagem aberta, digitar **sobrescrevia o PNG** com texto | `ddd29e4` |
| 9 | Nova nota podia sobrescrever nota existente | `writeFile` sem guarda; `isDuplicate` comparava a árvore em memória, até 1,5 s desatualizada e sem `normalize()` | `7134af0` |
| 10 | Regravação redundante a cada troca de nota | `saveTimeoutRef` nunca era zerada, então o cleanup regravava sempre; isso mudava o `mtime`, invalidava o cache e **reembedava a nota — custo de API — só por tê-la visitado** | `ddd29e4` |

O #6 exigiu um canal IPC **síncrono** (`fs:writeFileSync`): em `beforeunload`
uma Promise não chega a resolver.

O #7 exigiu também um **contador de geração de vault**, conferido antes dos
`set` finais de `buildEmbeddingIndex` e `loadTagsOnly` — sem ele, uma indexação
iniciada no vault anterior gravava o resultado por cima do novo.

---

## 3. Estabilidade

| # | Problema | Commit |
|---|---|---|
| 11 | 🔴 Decorações de Mermaid/LaTeX via `ViewPlugin` derrubavam o renderer | `eba2cfc` |
| 12 | 🟠 Ausência de *error boundary*: qualquer erro virava tela branca sem saída | `f2b3ded` |

**Sobre o #11** (descoberto em 28/10, antes desta revisão): o CodeMirror proíbe
decorações `replace` que cruzam quebras de linha vindas de um `ViewPlugin` —
lança `RangeError: Decorations that replace line breaks may not be specified via
plugins`. Um bloco ```` ```mermaid ```` **sempre** cruza. Toda nota com diagrama
derrubava o renderer. A correção foi migrar para `StateField`.

> **Custo assumido:** um `StateField` não enxerga o viewport, então agora varre o
> documento inteiro em vez de só a parte visível. Perdeu-se a otimização feita na
> atualização de julho. Foi uma troca consciente: lentidão em nota grande é
> preferível a tela branca. **Fica como trabalho futuro** (ver seção 7).

---

## 4. Testes automatizados

Commit `6155ae2`. De **zero testes em 39 arquivos** para **41 testes** em 4
arquivos, cobrindo a lógica pura (sem I/O, `fetch` sempre com mock):

- `similarity.ts` — cosseno (idênticos, ortogonais, opostos, escala, vetor nulo, simetria, dimensões incompatíveis) e `topKSimilar` (ordenação, limite `k`, índice vazio, coerência dos scores)
- `embedding.service.ts` — `EMBEDDING_DIMENSIONS`, coerência modelo/provedor, payloads Google e OpenAI, `taskType` assimétrico, rejeição de texto vazio, propagação de erro HTTP, loteamento de 150 textos em 2 requisições preservando a ordem
- `export.handler.ts` — `escapeHtml`
- `fs.handler.ts` — codificação/decodificação de caminho da lixeira, *round-trip* em caminhos aninhados nas duas convenções de separador

**Os testes acharam 2 bugs reais** (commit `d1a3790`), os dois verificados no
código antes da correção:

1. **`ModelRateLimiter.record()` contava cada requisição duas vezes.** `clean()`
   já grava a janela no `Map` e devolve essa referência; o segundo `push`
   incidia no mesmo array. O limite por minuto era consumido no dobro da
   velocidade.
2. **`cosineSimilarity` retornava `NaN`** com vetores de dimensões diferentes
   (`a[i] * b[i]` com `b[i]` indefinido), e a guarda `denom === 0` não pegava.
   Com `a` menor, as dimensões extras eram ignoradas em silêncio e vetores
   distintos davam similaridade 1. Nos dois casos a busca semântica falhava
   **sem erro visível**.

> O segundo é um bom gancho para a defesa: mostra teste como ferramenta de
> **descoberta** de comportamento, não apenas de regressão.

**Nota técnica:** o Vitest ficou na linha 2.x porque a 5.x exige `vite >= 6` e o
projeto está no 5.4. A configuração fica em `vitest.config.ts` separada do
`vite.config.ts` de propósito — o config de build carrega `vite-plugin-electron`,
que dispararia build do processo principal a cada rodada de teste.

---

## 5. Varredura funcional — 31 achados

Auditoria estática de `src/**` (35 arquivos), `electron/**` e `package.json`,
cruzada com os 66 achados anteriores para evitar repetição.

### Corrigidos (commits `3651dc4`, `7134af0`, `a3eb457`)

**Assistente de IA**
- As ações rápidas falavam da seleção ("Expanda o parágrafo **selecionado**") mas ela **nunca era lida** — a IA operava sempre sobre a nota inteira
- Contexto truncado em 4.000 caracteres **sem aviso**: um capítulo de TCC virava ~1,5 página e o "Resumir" saía incompleto. Limite para 24.000, e quando trunca a IA é instruída a dizer isso
- Resposta vazia (bloqueio de filtro ou limite de tokens) virava bolha em branco com botão "Inserir" que colava duas linhas vazias na nota
- Erros HTTP chegavam como corpo cru da API na bolha do chat, **vazando a chave na tela**

**Abrir e manipular notas**
- Abrir nota sem `try/catch` em 4 pontos: clicar numa nota movida ou excluída não fazia **absolutamente nada**
- Imagens abertas pela Busca ou pelas Tags carregavam como binário no editor
- Nova nota com `: ? * " < > |` falhava em silêncio (caso óbvio num TCC: `Cap 2: Metodologia`)
- Fechar o modal durante a geração por IA ainda criava e abria a nota
- Renomear: falha sem feedback; wikilinks com alias (`[[Nota|texto]]`) e âncora (`[[Nota#Seção]]`) não eram atualizados e passavam a apontar para nada; o loop lia `.png`/`.txt` e abortava no meio; renomear pasta deixava `activeFile` órfão
- Desfazer exclusão falhava em silêncio, e `lastDeleted` era gravado **antes** de a exclusão dar certo

**Interface**
- `Ctrl+\` alternava o layout **duas vezes** por toque (registrado no CodeMirror *e* no listener global) — o modo "editor" era inalcançável pelo atalho
- Pastas não colapsavam e clicar numa pasta não fazia nada; vault vazio era tela branca
- Tags nunca apareciam em vaults Windows: `extractTags` exigia `---\n` e nunca casava com CRLF
- Dois comandos mortos na paleta ("Typewriter" e "Restaurar")
- `embeddingError` nunca chegava à aba Busca, que dizia sempre "configure uma chave" mesmo quando a causa era outra
- Snippet semântico sem truncamento ocupava a sidebar inteira
- Menu de contexto sem *clamp* saía da tela na última nota

**Exportação**
- Slugs do site colidiam ("Capítulo 1" e "Capitulo 1" davam o mesmo) e uma página **sobrescrevia** a outra; nome só com emoji gerava arquivo `.html` sem nome
- `index.html` tinha `meta refresh` **e** uma capa completa que nunca era vista; o refresh ainda **prendia o botão Voltar**
- PDF sugeria sempre `nota.pdf` — exportar 8 capítulos sobrescrevia o anterior (o mesmo problema existia nos slides)
- Exportar slides falhava em silêncio total e sem estado de carregamento
- Clicar fora do editor de slides fechava os **dois** modais e descartava o fatiamento manual sem aviso
- Imagens com caminho relativo não apareciam no PDF nem no site

### Não confirmado

**CRLF quebrando o Mermaid no editor** — alegado pela auditoria, **refutado na
verificação**. O CodeMirror normaliza `\r\n` para `\n` ao criar o documento, e
nós vimos o diagrama renderizar na tela. A parte do mesmo achado sobre as *tags*
era real, porque ali o conteúdo é lido cru do disco.

> Fica o registro do método: **todo achado de auditoria foi verificado no código
> antes de virar correção.** Um dos 31 não se sustentou.

### Verificados e descartados pela própria auditoria

`FileTree.tsx:45` (ternário que parece bug mas está correto) · `stopPropagation`
do Escape no editor de slides (comportamento correto) · `useDebouncedValue` com
`flushKey` · cadeia da fila do `enqueueMermaidRender`.

---

## 6. Não corrigido — decisão consciente

| Item | Por quê |
|---|---|
| `restoreLastDeleted` restaura sempre o item mais recente da lixeira, não a nota que o banner oferece | Exige mudar a assinatura do handler; risco baixo na prática |
| Não há sistema de *toast*; os avisos usam modal de confirmação | Exige novo componente e mexer na store; o padrão atual já era usado no projeto |
| `isDuplicate` da nova nota compara só o basename em todo o vault | Intencional em vaults de wikilink (nomes devem ser únicos), mas a mensagem é enganosa |
| Erro de IPC no export de slides fica atrás do editor de slides | Exige mudar o contrato da prop `onExport` |
| `aiEnabled` e `editorMaxWidth` são configurações sem controle na interface | Precisa de UI nova; não há como desligar a IA depois de configurar a chave |
| Preview inline varre o documento inteiro a cada tecla | Regressão de desempenho assumida ao trocar `ViewPlugin` por `StateField` (ver seção 3) |

---

## 7. Trabalho futuro (para o capítulo do TCC)

1. **Otimizar as decorações inline** — cachear por versão do documento e iterar o
   `Text` do CodeMirror linha a linha, em vez de `doc.toString()`, recuperando a
   otimização de viewport perdida na correção do `StateField`.
2. **Sincronização criptografada opcional** entre dispositivos.
3. **Avaliação empírica com usuários** — hoje a validação é técnica (41 testes) e
   funcional (varredura manual), sem estudo com participantes.
4. **Ampliar a cobertura de testes** para os componentes de interface (hoje só
   lógica pura está coberta).
