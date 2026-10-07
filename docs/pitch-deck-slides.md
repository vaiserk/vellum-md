# Pitch Deck — VellumMD (texto dos slides + instruções para o Claude web)

**Disciplina:** Técnicas de Marketing / Administração de Empresas e Empreendedorismo
**Base:** contexto real do app (código) + Business Model Canvas já preenchido.

> Como usar: o texto abaixo (Slides 1–4, 6 e 7) está **pronto** para colar. O **Slide 5
> (Mercado)** depende de pesquisa com fontes — deixei o modelo montado e, no fim do
> arquivo, um **prompt pronto para colar no Claude web** para preencher os números com
> fontes e/ou montar o deck. Números de mercado NÃO foram inventados aqui.

---

## Diretrizes de design do deck *(seguir em todos os slides)*

- **Tema:** moderno, limpo e profissional. Sugestão alinhada à identidade do VellumMD:
  fundo escuro azul-marinho/grafite com cor de destaque **roxo/índigo (#6C63FF)** —
  ou, se preferir claro, fundo branco com títulos em azul-marinho e destaques em índigo.
- **Fontes grandes e legíveis** (sans-serif, ex.: Inter, Poppins ou Montserrat):
  - Título do slide: **36–44 pt**
  - Subtítulo: **26–30 pt**
  - Texto/bullets: **22–26 pt** (nunca abaixo de 20 pt)
- **Contraste alto:** texto claro sobre fundo escuro **ou** texto escuro sobre fundo claro.
  Evitar cinza-claro sobre branco. Cor de destaque só para dar ênfase, não no texto todo.
- **Pouco texto por slide:** no máximo 3–5 bullets curtos; uma ideia por slide.
- **Imagens grandes** e com respiro (margens); screenshots ocupando boa parte do slide.
- **Formato de saída: `.pptx` editável** (PowerPoint), para poder ajustar texto e imagens
  depois. Se a ferramenta oferecer HTML/Canva com resultado visual melhor, tudo bem — mas
  garanta uma versão **editável em .pptx** ao final.

---

## Slide 0 — Capa (abertura)

- **Projeto:** VellumMD
- **Subtítulo/tagline:** *Seu segundo cérebro — busca por significado, com IA e privacidade local.*
- **Aluno:** Otavio Freitas dos Santos
- **Disciplina:** Administração de Empresas e Empreendedorismo
- **Professor:** Rafael Gregui

> Design da capa: título do projeto bem grande e centralizado, tagline logo abaixo, e os
> dados (aluno, disciplina, professor) menores no rodapé ou canto. Pode usar o ícone/logo
> do app (o pergaminho 📜) como elemento visual.

---

## Slide 1 — O Problema *(modelo Airbnb: 3 frases curtas)*

- **Anotações viram um labirinto:** quem estuda e produz muito conteúdo acumula notas espalhadas e **não reencontra o que já escreveu**, porque a busca comum exige lembrar a palavra exata.
- **Ferramentas atuais custam sua privacidade:** os apps populares guardam tudo na **nuvem de terceiros**, tirando do usuário o controle sobre os próprios dados.
- **Escrita técnica é sofrida:** fórmulas, diagramas e ligações entre ideias normalmente exigem **várias ferramentas desconectadas**.

---

## Slide 2 — A Solução

**Frase de impacto:** *"O VellumMD transforma suas anotações em um segundo cérebro que funciona no seu computador — você encontra o que precisa pelo significado, com a ajuda da IA, sem abrir mão da privacidade."*

**3 pilares de benefício (com o "como?"):**
1. **Encontra pelo significado (produtividade).** *Como?* A busca semântica por IA localiza a nota certa mesmo quando você não lembra as palavras exatas que usou.
2. **Privacidade e controle (segurança).** *Como?* Os arquivos ficam no seu computador, em formato aberto (Markdown); funciona offline para escrever, organizar e buscar.
3. **Tudo em um só lugar (economia de tempo).** *Como?* Editor com fórmulas (LaTeX), diagramas (Mermaid), assistente de IA e exportação para PDF/slides/site — sem pular entre apps.

---

## Slide 3 — O Produto

**Entrega concreta + "a mágica por trás":** um editor de Markdown desktop que indexa suas notas em **vetores semânticos** (embeddings) guardados localmente; ao buscar, ele compara o significado da sua pergunta com o de cada nota (similaridade de cosseno) e ainda usa **LLMs** para resumir, explicar e conectar ideias dentro do editor.

**3 benefícios principais:**
- **Benefício 1 — Busca por significado:** recupere qualquer ideia sem depender de palavra-chave exata.
- **Benefício 2 — Assistente de IA contextual:** resume, reescreve, explica e sugere conexões usando o conteúdo da nota ativa.
- **Benefício 3 — Omni-export:** de uma única fonte Markdown, gera PDF, apresentação de slides e site estático.

> As capturas de tela vêm **logo depois deste slide, uma tela por slide** (Slides 3.1 a
> 3.3), cada uma com uma legenda curta ligando a imagem ao benefício que ela prova.

### Slide 3.1 — Captura: Tela de abertura
- **Imagem:** tela de **onboarding** ("VellumMD — your second brain, rendered beautifully").
- **Legenda curta:** *Um espaço de escrita local, pronto para virar seu segundo cérebro.*

### Slide 3.2 — Captura: Editor + IA
- **Imagem:** **editor dividido** mostrando uma nota com **fórmula LaTeX** renderizada + o balão **"Explicação gerada"** pela IA.
- **Legenda curta:** *Escrita técnica (LaTeX, diagramas) e assistente de IA no mesmo lugar.*

### Slide 3.3 — Captura: Busca semântica
- **Imagem:** a **aba de Busca** com resultados semânticos.
- **Legenda curta:** *Encontre pelo significado — mesmo sem lembrar as palavras exatas.*

> Dica da aula: uma imagem por slide, ocupando bem o espaço, com pouquíssimo texto. A
> legenda existe só para amarrar a tela ao benefício.

---

## Slide 4 — Tecnologia / Diferenciais

O que o VellumMD tem que a maioria não tem:
- **Local-first + IA na mesma ferramenta:** a maioria escolhe *ou* privacidade local *ou* recursos de IA (que exigem nuvem). Aqui os dois convivem — a IA é opcional e os dados permanecem do usuário.
- **Busca semântica sobre arquivos locais:** indexação por embeddings com **cache incremental** (só reindexa o que mudou) e comparação vetorial **feita localmente** — só a vetorização da consulta usa a rede.
- **Multiplataforma e multi-provedor de IA:** desktop para Windows/macOS/Linux (base única em Electron); o usuário escolhe entre vários provedores de IA (Google, OpenAI, Anthropic, Groq).
- **Formato aberto (sem aprisionamento):** notas em Markdown puro; o usuário leva os dados quando quiser.
- **Escrita técnica nativa:** LaTeX, diagramas Mermaid e wikilinks integrados — pensado para o público acadêmico e de engenharia.

---

## Slide 5 — Mercado *(modelo Dave McClure — PREENCHER COM PESQUISA)*

> Este slide precisa de **fontes externas**. Não inventei os números; abaixo está a
> fórmula montada e, no fim do arquivo, o prompt para o Claude web buscar os dados com
> fonte. Preencha os campos entre colchetes.

Fórmula: **Tamanho do Mercado = X × Y × Z**
- **Y = consumidores no mercado** → [nº de estudantes de ensino superior + profissionais do conhecimento no Brasil] · *fonte:* [ex.: Censo da Educação Superior/INEP]
- **X = valor médio do produto** → [mensalidade média anual de um plano pago, ex.: R$ 19,90 × 12 = R$ 238,80]
- **Z = fração que efetivamente pagaria** → [taxa de conversão freemium, ex.: 2–4%]
- **TAM/estimativa hoje** = X × Y × Z = [R$ ____]
- **Projeção em 5 anos** = [crescimento anual estimado do mercado de PKM/produtividade] → [R$ ____]

Estrutura sugerida de apresentação (como no exemplo dos restaurantes do slide):
- "[Y] pessoas no público-alvo no Brasil" → *fonte*
- "Hoje ~[__]% usam ferramentas de PKM; em 5 anos ~[__]%" → mercado crescendo [__]%/ano
- "Um plano custa em média R$[__]/ano" → valor médio do produto
- "Mercado disponível hoje: R$[__] · em 5 anos: R$[__]"

---

## Slide 6 — Competidores

Concorrentes (diretos e indiretos) do nicho de PKM / notas:

- **Obsidian** — *Faz bem:* local-first, Markdown, altamente extensível por plugins; forte na comunidade técnica. *Onde falha:* busca semântica e IA só via plugins/configuração manual; curva de aprendizado alta.
- **Notion** — *Faz bem:* colaboração, bancos de dados flexíveis, IA integrada; visual amigável. *Onde falha:* 100% na nuvem (sem privacidade local), não é Markdown puro (aprisiona os dados), IA é add-on pago e depende de internet.
- **Evernote** — *Faz bem:* captura rápida, reconhecido, multiplataforma. *Onde falha:* nuvem proprietária, fraco para escrita técnica (LaTeX/diagramas), sem busca semântica real; percepção de estagnação.

**Por que o VellumMD é diferente/melhor:** é o único que junta, numa só ferramenta,
**privacidade local (Markdown, offline)** + **busca por significado** + **assistente de IA
com múltiplos provedores** + **escrita técnica nativa (LaTeX/Mermaid)**. Onde os outros
obrigam a escolher entre privacidade e IA, o VellumMD entrega os dois.

---

## Slide 7 — Modelo de Negócios *(baseado no BMC)*

**Fonte de receita prioritária:** modelo **Freemium**.
- **Grátis:** uso local completo (editor, organização, busca léxica) — sem custo de IA para o negócio.
- **Pago (VellumMD Pro):** assinatura que libera **cotas de uso do serviço de IA e de geração de embeddings** para a busca semântica (é o que gera receita e o que tem custo variável).
- **Secundária:** planos institucionais (faculdades/escolas).

**Projeção (exemplo — hipótese a validar):**
Premissas: preço Pro **R$ 19,90/mês** · conversão freemium **3%**.

| Base de usuários | Pagantes (3%) | Receita anual bruta |
|---|---|---|
| 10.000 | 300 | ~R$ 71,6 mil |
| 100.000 | 3.000 | ~R$ 716 mil |
| 1.000.000 | 30.000 | ~R$ 7,16 milhões |

> **Ponto de viabilidade (dizer na banca):** como a IA é custo variável do negócio, a cota
> de cada plano precisa ser dimensionada para cobrir, com margem, o custo médio de IA por
> assinante. A receita acima é bruta; a margem depende desse equilíbrio.

---

## Slide 8 — Referências *(padrão ABNT — NBR 6023)*

> Liste aqui **as fontes usadas na pesquisa de mercado (Slide 5)** e quaisquer dados de
> concorrentes citados, em ordem alfabética. Como a pesquisa será feita no Claude web,
> peça a ele para **devolver as referências já no formato ABNT** com os links e a data de
> acesso — depois é só colar aqui. Fonte de dados numéricos = sempre referenciar.

**Modelo ABNT para documento eletrônico:**
SOBRENOME, Nome (ou INSTITUIÇÃO). **Título do documento**: subtítulo. Local: Editora/Órgão, ano. Disponível em: URL. Acesso em: dia mês (abreviado). ano.

**Exemplos (confirmar dados e datas de acesso):**
- INSTITUTO NACIONAL DE ESTUDOS E PESQUISAS EDUCACIONAIS ANÍSIO TEIXEIRA. **Censo da Educação Superior [ano]**. Brasília: INEP, [ano]. Disponível em: [URL]. Acesso em: [dia mês. ano].
- [SOBRENOME, Nome. **Título do relatório de mercado**. Local: Editora, ano. Disponível em: [URL]. Acesso em: [dia mês. ano].]
- [ORGANIZAÇÃO. **Título da estatística de mercado de software/PKM**. [Local]: [Órgão], [ano]. Disponível em: [URL]. Acesso em: [dia mês. ano].]

> Dica de design: neste slide pode usar fonte um pouco menor que o corpo (18–20 pt) por
> ser lista de referência, mantendo bom contraste. Alinhar à esquerda.

---

## Slide 9 — Obrigado!

- **Texto grande e centralizado:** *Obrigado!*
- Abaixo, menor: **VellumMD** · Otavio Freitas dos Santos
- Opcional: contato/e-mail ou link do projeto (GitHub), e o ícone 📜 do app.

> Design: slide limpo, mesmo tema/cores dos demais, com o "Obrigado!" em destaque
> (44–60 pt) e os dados de contato discretos no rodapé.

---

## Instruções + PROMPT para colar no Claude na web

Você vai usar o Claude web para (a) **preencher o Slide 5 com pesquisa e fontes** e
(b) **montar o deck**. Cole o texto abaixo lá:

```
Você é especialista em pitch decks e análise de mercado. Vou te dar o conteúdo de um
pitch de 7 slides já redigido (abaixo) e preciso de duas coisas:

1) PESQUISA DE MERCADO (Slide 5 — modelo Dave McClure), com FONTES citadas e links:
   - Estime o público-alvo no Brasil (Y): estudantes de ensino superior (use o Censo da
     Educação Superior / INEP mais recente) + profissionais do conhecimento.
   - Adote valor médio anual por assinante pago (X): R$ 19,90/mês (R$ 238,80/ano).
   - Adote conversão freemium (Z): entre 2% e 4%.
   - Calcule o mercado disponível hoje (X × Y × Z) e projete para 5 anos, citando uma
     taxa de crescimento do mercado de software de produtividade/PKM com fonte.
   - Apresente no formato de frases curtas do modelo McClure e um gráfico simples.

2) MONTAGEM DO DECK: gere um artifact (HTML/slides) nesta ordem: CAPA + Slides 1 a 7
   (o Slide 3 seguido de 3 slides de imagem, um print por slide) + Slide de REFERÊNCIAS
   + Slide de OBRIGADO. Use o texto que forneço abaixo verbatim nos slides 1–4, 6 e 7, e o
   resultado da sua pesquisa no slide 5.
   - REFERÊNCIAS: liste TODAS as fontes que você usou na pesquisa de mercado, já
     formatadas em ABNT (NBR 6023), com URL e "Acesso em: [data]". Em ordem alfabética.

   DESIGN (obrigatório):
   - Tema moderno e profissional; cor de destaque roxo/índigo (#6C63FF). Alto contraste
     (texto claro em fundo escuro OU escuro em fundo claro) — nada de cinza-claro no branco.
   - Fontes grandes e legíveis (sans-serif): título 36–44pt, subtítulo 26–30pt, corpo
     22–26pt (nunca < 20pt). Pouco texto por slide (3–5 bullets), uma ideia por slide.
   - CAPA com: projeto "VellumMD" (grande), tagline, e no rodapé — Aluno: Otavio Freitas
     dos Santos · Disciplina: Administração de Empresas e Empreendedorismo · Professor:
     Rafael Gregui.
   - Slides de screenshot: UMA imagem por slide, ocupando boa parte do slide, com legenda
     curta. (Deixe placeholders de imagem; eu insiro os prints depois.)
   - FORMATO DE SAÍDA: gere o deck como **arquivo .pptx editável** (PowerPoint) para eu
     baixar e ajustar depois. Aplique o design acima dentro do próprio .pptx.

CONTEXTO DO APP (VellumMD): editor de Markdown desktop, local-first (dados só no
computador do usuário, em Markdown puro, funciona offline), com busca semântica por
embeddings (encontra notas pelo significado), assistente de IA contextual (resumir,
explicar, conectar), suporte a LaTeX e diagramas Mermaid, e exportação para PDF, slides
e site estático. Multiplataforma (Electron) e multi-provedor de IA (Google, OpenAI,
Anthropic, Groq). Modelo de negócio: freemium com assinatura que libera cotas de IA.

TEXTO DOS SLIDES (use verbatim onde indicado):
[COLE AQUI os Slides 1 a 7 deste arquivo]
```

> Dica: quando colar, substitua a linha final `[COLE AQUI ...]` pelos Slides 1–7 acima.
> Peça ao Claude web para **não inventar números** e sempre mostrar a fonte no Slide 5.
