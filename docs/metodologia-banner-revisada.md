# Metodologia do banner — texto e diagrama da metodologia de pesquisa

A seção **Metodologia** do banner passa a tratar da **metodologia de pesquisa e
desenvolvimento** — como o trabalho foi conduzido —, e não da arquitetura do software.
A Figura 1 passa a ilustrar esse percurso.

Base: o parágrafo de Metodologia já redigido no TCC.

---

## 1. O que muda no banner

| Antes | Depois |
|---|---|
| 3 parágrafos: pesquisa → **arquitetura** → pilha de renderização | 2 parágrafos: **pesquisa e planejamento** → **cinco fases e testes** |
| Figura 1 = diagrama de arquitetura em camadas | Figura 1 = **percurso metodológico** (as cinco fases) |

**Por que tirar a arquitetura daqui.** Metodologia responde *"como o trabalho foi
feito"*; arquitetura responde *"como o software é por dentro"* — é resultado, não
método. Além disso, o banner já tem a **Figura 2 (pipeline da busca semântica)** na
seção Resultados, que sustenta a profundidade técnica. Manter dois diagramas de
arquitetura seria redundante e deixaria a metodologia sem ilustração própria.

> As quatro caixas atuais da Figura 1 (Interface → contextBridge → Processo principal
> → Sistema de arquivos) devem ser **apagadas**. São formas nativas do PowerPoint:
> basta selecionar e deletar.

---

## 2. Os dois parágrafos novos

Para colar no lugar dos parágrafos atuais da Metodologia:

> A metodologia baseou-se em pesquisa de artigos científicos, documentações técnicas
> e trabalhos relacionados sobre gestão do conhecimento pessoal, sobrecarga
> informacional, editores de texto e integração de inteligência artificial em
> aplicações *desktop*. No planejamento, aplicaram-se etapas da Engenharia de
> Software: análise de requisitos funcionais e não funcionais e elaboração de
> diagramas UML — casos de uso, casos de uso expandido e diagrama de classes.

> O desenvolvimento seguiu uma abordagem **iterativa e incremental**, organizada em
> cinco fases progressivas: (1) núcleo do editor e gerenciamento do *vault*;
> (2) extensões de *wikilinks* e suporte a diagramas; (3) integração dos módulos de IA
> e busca semântica; (4) *pipeline* de exportação multiformato; e (5) polimento e
> distribuição multiplataforma. O sistema foi implementado com Electron, TypeScript,
> React e CodeMirror 6. Realizaram-se, ainda, testes práticos em cenários reais de uso
> — criação e navegação entre notas, exportação de documentos e busca semântica —
> voltados a avaliar a eficácia e a usabilidade do sistema.

**O que mudou em relação ao texto do TCC:**

| Ajuste | Motivo |
|---|---|
| Quebrado em 2 parágrafos (pesquisa/planejamento · desenvolvimento/testes) | Um bloco único de 15 linhas não se lê de pé, a 2 metros |
| As cinco fases ganharam numeração explícita `(1)…(5)` | Permite que o leitor cruze o texto com os números do diagrama |
| A pilha tecnológica virou uma frase curta | A banca espera ver o *stack*, mas ele não merece um parágrafo |
| Saiu o parágrafo de arquitetura e o de renderização | Pertencem a Resultados, não a Metodologia |

---

## 3. Prompt para o Claude na web (nova Figura 1)

Cole o bloco inteiro:

````text
Preciso de um diagrama para ilustrar a METODOLOGIA DE PESQUISA de um banner
acadêmico de TCC, que será impresso em 90 x 120 cm.

O QUE O DIAGRAMA REPRESENTA
O percurso metodológico do trabalho, em três momentos encadeados, sendo que o do
meio é um ciclo iterativo e incremental com cinco fases progressivas.

CONTEÚDO (seguir exatamente)

ENTRADA — dois blocos encadeados, à esquerda:
  Bloco A: "Revisão bibliográfica"
           subtexto: "artigos científicos, documentações técnicas e trabalhos
           relacionados"
  Bloco B: "Planejamento — Engenharia de Software"
           subtexto: "requisitos funcionais e não funcionais; diagramas UML:
           casos de uso, casos de uso expandido e classes"

CENTRO — as cinco fases do desenvolvimento, NUMERADAS e em sequência horizontal,
sob um rótulo comum "Desenvolvimento iterativo e incremental":
  1. Núcleo do editor e gerenciamento do vault
  2. Wikilinks e suporte a diagramas
  3. Integração de IA e busca semântica
  4. Pipeline de exportação multiformato
  5. Polimento e distribuição multiplataforma

SAÍDA — um bloco à direita:
  "Testes práticos em cenários reais"
  subtexto: "criação e navegação entre notas, exportação de documentos e busca
  semântica — avaliação de eficácia e usabilidade"

CICLO: uma seta de retorno passando POR BAIXO das cinco fases, saindo do bloco de
testes e voltando para as fases, com o rótulo "refinamento a cada iteração".
Essa seta é o que comunica que o processo foi iterativo — ela é essencial.

ESPECIFICAÇÃO VISUAL
- Formato: SVG (impressão em banner — precisa ser vetorial).
- Proporção: aproximadamente 3,5 : 1 (largura : altura). Ocupará cerca de
  38 cm de largura por 11 cm de altura. Layout HORIZONTAL, da esquerda para a direita.
- Fundo branco. Fonte Arial.
- Será lido de pé, a cerca de 2 metros: títulos das caixas em negrito e grandes;
  os subtextos podem ser bem menores, mas ainda legíveis.
- Os números das cinco fases devem aparecer em destaque (círculos numerados ou
  numeral grande), porque o texto do banner se refere a eles como (1) a (5).
- Paleta (usar exatamente estas cores, são as do banner):
    Azul-marinho  #1E3957  -> blocos de entrada (revisão e planejamento)
    Roxo          #5B4FE0  -> as cinco fases de desenvolvimento
    Verde         #2E9E5B  -> bloco de testes práticos
    Cinza         #5A6675  -> setas, inclusive a de retorno
    Borda clara   #C9D2DE  -> contornos auxiliares
    Texto sobre cor: branco. Texto sobre branco: #242424
- Sem sombras, sem gradientes, sem ícones decorativos. Visual limpo e técnico.

ENTREGA
Devolva o SVG completo em um bloco de código, pronto para eu salvar como arquivo.
Se algum subtexto ficar comprido demais para o espaço, encurte-o em vez de deixar
o texto transbordar da caixa.
````

---

## 4. Depois de gerar

1. Salvar como `docs/banner/imagens/figura1-metodologia.svg`
2. Abrir `docs/banner/VELLUMMD_Banner_v2.pptx`
3. **Apagar** as quatro caixas da Figura 1 atual e as setas entre elas
4. **Inserir → Imagem** e encaixar no espaço vago da coluna direita
5. Trocar a legenda para:

   **Figura 1 – Percurso metodológico do desenvolvimento do VellumMD.**

   Mantendo o *"Fonte: Autoria própria."* abaixo.

Se o PowerPoint não lidar bem com o SVG, peça o mesmo diagrama em PNG com **no
mínimo 4.500 px de largura** (equivale a 300 dpi nos 38 cm que ele ocupa).

---

## 5. Conferir antes de fechar

- [ ] O texto do banner e o diagrama usam a **mesma numeração** das cinco fases
- [ ] A seta de retorno ("refinamento a cada iteração") está visível — é ela que
      prova que o processo foi iterativo, e não uma cascata
- [ ] Nenhum texto transbordou das caixas
- [ ] A seção Metodologia não fala mais de arquitetura
