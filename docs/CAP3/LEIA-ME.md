# Capítulo 3 — Modelagem e Desenvolvimento (material de apoio)

Esta pasta contém o Capítulo 3 do TCC e os artefatos de modelagem, prontos para colar no
Word.

## Arquivos

- **`Capitulo-3-Modelagem-e-Desenvolvimento.md`** — o capítulo completo. Cole no Word e
  aplique os estilos do template (Título 1/2/3, Quadro, Figura). O texto usa **citações
  indiretas** (autor-data) de Fowler e Pressman & Maxim; veja as referências abaixo.
- **`diagramas/*.puml`** — os quatro diagramas em código PlantUML, renderizáveis.

## Como gerar as imagens dos diagramas (PlantUML)

Escolha uma das opções e exporte em PNG/SVG para inserir no Word:

1. **Online (mais rápido):** acesse <https://www.plantuml.com/plantuml>, cole o conteúdo
   de cada `.puml` e baixe a imagem.
2. **VS Code:** instale a extensão *PlantUML* (jebbs), abra o `.puml`, use
   `Alt+D` para pré-visualizar e exporte.
3. **Linha de comando:** com o `plantuml.jar`, execute `java -jar plantuml.jar docs/CAP3/diagramas/*.puml`.

O código PlantUML também está embutido no próprio capítulo (em blocos ```` ```plantuml ````),
para referência.

## Ordem e nomes das figuras (como aparecem no capítulo)

| Ordem | Figura | Nome | Arquivo |
|-------|--------|------|---------|
| 1º | Figura 1 | Diagrama de casos de uso do sistema VellumMD | `diagramas/01-caso-de-uso.puml` |
| 2º | Figura 2 | Diagrama de classes (modelo conceitual de domínio) | `diagramas/02-classes.puml` |
| 3º | Figura 3 | Diagrama de sequência: busca semântica (**principal**) | `diagramas/03-sequencia-busca-semantica.puml` |
| 4º | Figura 4 | Diagrama de sequência: edição com salvamento automático (complementar) | `diagramas/04-sequencia-edicao-autosave.puml` |

> A numeração das figuras/quadros reinicia neste capítulo. Se o seu documento numera as
> figuras de forma contínua desde a Introdução, ajuste os números (ex.: se a última figura
> do Cap. 2 for a Figura 5, estas passam a ser Figuras 6 a 9). O mesmo vale para os
> Quadros.

## Ordem e nomes dos quadros

| Quadro | Conteúdo |
|--------|----------|
| Quadro 1 | Requisitos funcionais |
| Quadro 2 | Requisitos não funcionais |
| Quadros 3 a 10 | Casos de uso expandidos (UC01 a UC08) |
| Quadro 11 | Ferramentas e tecnologias utilizadas |

> **Observação ABNT:** requisitos e casos de uso são informações **qualitativas** e, por
> isso, foram formatados como **Quadros** (moldura fechada nos quatro lados), e não como
> Tabelas (reservadas a dados numéricos/estatísticos, com laterais abertas). Ao passar para
> o Word, aplique bordas completas nos quadros e mantenha o título **acima** e a fonte
> **abaixo** de cada quadro/figura.

## Referências utilizadas neste capítulo (ABNT)

> FOWLER, Martin. **UML essencial**: um breve guia para a linguagem-padrão de modelagem de
> objetos. 3. ed. Porto Alegre: Bookman, 2005.

> PRESSMAN, Roger S.; MAXIM, Bruce R. **Engenharia de software**: uma abordagem
> profissional. 9. ed. Porto Alegre: AMGH, 2021.

### Onde cada citação foi ancorada

- **Requisitos funcionais e não funcionais** → Pressman & Maxim (2021), Cap. 7
  ("Entendendo os requisitos"), incluindo a seção 7.2.5 sobre requisitos não funcionais.
- **Casos de uso** → Fowler (2005, p. 104) e Pressman & Maxim (2021), seção 8.2.2
  ("Criação de casos de uso").
- **Diagrama de classes** → Fowler (2005, p. 52) e Pressman & Maxim (2021), seção 8.3
  ("Modelagem baseada em classes").
- **Diagrama de sequência** → Fowler (2005, p. 67).
- **Uso da UML como apoio à comunicação** → Fowler (2005, p. 25).

> As páginas de Fowler foram verificadas no sumário da edição. Para Pressman & Maxim, as
> citações são indiretas (paráfrase) e referenciam os capítulos/seções indicados; caso
> deseje incluir o número de página exato, ele pode ser conferido diretamente no livro
> físico nas seções apontadas acima — a ABNT não exige página em citação indireta.
