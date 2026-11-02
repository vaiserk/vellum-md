# vault-demo2 — vault de demonstração para as capturas

Vault preparado para as capturas do Capítulo 4, descritas em
[`ROTEIRO-CAPTURAS.md`](ROTEIRO-CAPTURAS.md).

**Caminho:** `docs/CAP4/vault-demo2`

São **20 notas curtas** em três subpastas. A maioria cabe numa tela sem rolagem
— intencionalmente: nota longa rende captura ruim, porque obriga a rolar e
nenhuma figura mostra a nota inteira.

> ⚠️ Este arquivo fica **fora** do vault de propósito. Se estivesse dentro,
> apareceria na árvore de notas e sujaria todas as capturas.

---

## Estrutura

```
vault-demo2/
├── 00 - Comece aqui.md          índice, wikilinks para tudo
├── 01 - Panorama.md             ★ a nota da captura A07
├── Segundo Cerebro.md           ★ alvo dos backlinks (6 notas apontam)
├── Carga Cognitiva.md           ★ alvo da busca semântica
├── Zettelkasten.md
├── Notas Atomicas.md
├── Markdown Essencial.md        ★ formatação, links e imagem
├── Wikilinks.md                 ★ as três formas de ligar notas
├── Callouts.md                  ★ os 5 tipos de destaque
├── Formulas.md                  ★ LaTeX em linha e em bloco
├── Diagramas.md                 ★ fluxograma e diagrama de sequência
├── Tabelas e Codigo.md          ★ alinhamento e blocos de código
├── Tarefas da Semana.md         ★ lista de tarefas interativa
├── assets/
│   └── ciclo-da-nota.png
├── Pesquisa/
│   ├── Busca Semantica.md
│   ├── Arquitetura.md
│   └── Metodo de Pesquisa.md
├── Aulas/
│   ├── Apresentacao.md          ★ pronta para exportar como slides
│   └── Resumo de Aula.md
└── Diario/
    ├── 2026-10-28.md
    └── 2026-11-02.md
```

---

## Onde cada recurso é demonstrado

| Recurso | Nota | Capturas |
|---|---|---|
| Visão geral numa tela só | `01 - Panorama` | A07, A31 |
| Negrito, itálico, tachado, código inline | `Markdown Essencial` | A19 |
| Listas simples, aninhadas e ordenadas | `Markdown Essencial` | A19 |
| Citação e linha horizontal | `Markdown Essencial` | A19 |
| Link externo (`https://`) | `Markdown Essencial` | A46 |
| Link sem esquema (`www.google.com`) | `Markdown Essencial` | A46 |
| Imagem incorporada | `Markdown Essencial` | A37 |
| Callouts (NOTE, TIP, IMPORTANT, WARNING, CAUTION) | `Callouts` | A32 |
| Fórmulas LaTeX | `Formulas`, `01 - Panorama` | A24, A34 |
| Diagramas Mermaid | `Diagramas`, `Arquitetura`, `Metodo de Pesquisa` | A25, A35 |
| Tabelas com alinhamento | `Tabelas e Codigo` | A26 |
| Código com realce (python, bash, json) | `Tabelas e Codigo` | A36 |
| Lista de tarefas interativa | `Tarefas da Semana` | A33 |
| Wikilinks: simples, com apelido e com âncora | `Wikilinks` | A23, A38 |
| Ligação para nota inexistente | `Wikilinks` | A38 |
| Backlinks | `Segundo Cerebro` (7 notas apontam) | A39 |
| Tags | todas (6 tags) | A40 |
| Hierarquia de pastas | `Pesquisa/`, `Aulas/`, `Diario/` | A08, A09 |
| Busca léxica | `Zettelkasten` | A43 |
| Busca semântica | `Carga Cognitiva`, `Segundo Cerebro` | B06, B07 |
| Exportação como slides | `Aulas/Apresentacao` | C04, C06 |

### Tags disponíveis

| Tag | Notas |
|---|---|
| `referencia` | 8 |
| `tcc` | 8 |
| `metodo` | 7 |
| `pkm` | 7 |
| `markdown` | 6 |
| `aula` | 2 |

### Backlinks

| Nota | Quantas apontam para ela |
|---|---|
| `Segundo Cerebro` | 7 |
| `Carga Cognitiva` | 5 |
| `Zettelkasten` | 4 |
| `Busca Semantica` | 4 |

---

## Por que a busca semântica funciona neste vault

A consulta sugerida para as capturas **B06** e **B07** é:

> *como reduzir o esforço de lembrar das coisas*

Essa frase **não aparece em nenhuma nota** — conferido. Mesmo assim, a busca
semântica traz `Carga Cognitiva` e `Segundo Cerebro`, porque é disso que elas
tratam com outras palavras ("memória de trabalho", "transferir ao arquivo o que
a mente não precisa sustentar").

A busca léxica do app compara a **consulta inteira** como trecho literal do
texto, não termo a termo. Uma frase longa, portanto, não retorna nada — e é
isso que torna a comparação de B07 honesta em vez de encenada.

---

## Antes de começar as capturas

- [ ] Abrir o vault: **Abrir Vault** → `docs/CAP4/vault-demo2`
- [ ] **Conferir a imagem**: abrir `Markdown Essencial` e ver se a figura aparece
      na pré-visualização
- [ ] Conferir que a aba 🏷️ mostra as 6 tags
- [ ] Conferir que `Segundo Cerebro` mostra 7 backlinks na aba 🔗
- [ ] Abrir `Wikilinks` e conferir as três formas de ligação

> 📌 **Sobre a imagem.** O caminho é relativo (`assets/ciclo-da-nota.png`), que é
> como se escreve Markdown normalmente. Isso passou a funcionar na correção de
> 02/11/2026: antes, caminho relativo era resolvido a partir da pasta do
> aplicativo, e só caminho absoluto `file:///` aparecia. Como agora é relativo, o
> vault pode ser movido ou copiado para outra máquina sem quebrar a figura.

---

## O link quebrado é de propósito

A nota `Wikilinks` contém **[[Nota Futura]]**, que não existe. Não é descuido:
é a demonstração de que o aplicativo marca ligações pendentes e oferece criar a
nota ao clique — comportamento que vale uma figura.

Se preferir que nenhuma captura mostre link marcado, basta apagar esse parágrafo
da nota antes de fotografar.

---

## Sobre o RF11

O requisito promete wikilinks "incluindo apelidos e âncoras de seção". As três
formas estão demonstradas na nota `Wikilinks` e funcionam em todos os lugares:

| Forma | Editor | Pré-visualização | Backlinks | Site exportado |
|---|---|---|---|---|
| `[[Nota]]` | ✓ | ✓ | ✓ | ✓ |
| `[[Nota\|apelido]]` | ✓ | ✓ | ✓ | ✓ |
| `[[Nota#Seção]]` | ✓ | ✓ (rola até a seção) | ✓ | ✓ (âncora no HTML) |

---

## Como foi gerado

As notas foram escritas uma a uma, não extraídas de material real — nenhum dado
pessoal entra nas capturas. A figura `assets/ciclo-da-nota.png` foi desenhada
para este vault, na mesma cor do aplicativo.
