# Estratégia de Precificação — VellumMD

**Disciplina:** Administração de Empresas e Empreendedorismo
**Professor:** Rafael Gregui
**Produto:** VellumMD — editor de Markdown *local-first* com busca semântica e assistência por IA

> **Modelo de negócio adotado:** **freemium** — uso local gratuito e assinatura paga que libera
> **cotas de uso de IA e de geração de embeddings**. O negócio **hospeda e intermedia** as APIs
> de IA; portanto o custo da IA é **custo direto do negócio** (CPV), e não do usuário.

---

## 0. Alinhamento com as entregas anteriores

Este documento foi conferido contra as três entregas anteriores da disciplina. Registram-se aqui
as compatibilizações feitas:

| Documento | Premissa | Situação |
|---|---|---|
| `atividade-empreendedorismo.md` | Problema, evidências e diferenciais (local-first + IA, LGPD, soberania de dados) | ✅ Compatível — sustenta a estratégia de **diferenciação** adotada |
| `business-model-canvas-completo.md` | Receita = assinatura com **cotas de IA/embeddings**; IA é custo **variável do negócio** | ✅ Compatível — é a premissa central deste cálculo |
| `business-model-canvas-completo.md` | Custos incluem "taxas do gateway **e das lojas (~15–30%)**" | ⚠️ Incorporado na **seção 11.1** (análise por canal de venda) |
| `pitch-deck-slides.md` | Preço do plano pago: **R$ 19,90/mês**, conversão freemium de 3% | ✅ **Adotado** como preço do plano Pro — ver seção 8 e validação na seção 10.3 |
| `business-model-canvas-vellummd.md` | "Custo de IA ≈ zero (usuário usa a própria chave de API)" | ❌ **Premissa superada** — ver nota abaixo |

> **Nota sobre a versão antiga do Canvas.** O arquivo `business-model-canvas-vellummd.md` (primeira
> versão, anterior ao Canvas efetivamente preenchido) parte de um modelo em que o **usuário traz a
> própria chave de API**, de modo que o custo de IA não recairia sobre o negócio. O Canvas final
> adotou o modelo oposto — **venda de cotas** —, no qual a IA é o principal custo variável. Como as
> duas premissas são mutuamente exclusivas e levam a preços completamente diferentes, **este
> documento segue o Canvas final** (`business-model-canvas-completo.md`), que é o entregue. A versão
> antiga deve ser tratada como rascunho descartado.

---

## 1. Pesquisa da concorrência

Primeira etapa recomendada pelo material da disciplina: *pesquisar a concorrência* para obter a
visão de **máximos e mínimos** praticados no setor antes de elaborar hipóteses de preço. Os
concorrentes abaixo incluem os três já citados na atividade de empreendedorismo (Obsidian, Notion
e Logseq), acrescidos dos concorrentes diretos em busca semântica por IA.

### Quadro 1 — Preços praticados pelos concorrentes (out/2026)

| Concorrente | Plano | Preço (USD/usuário/mês) | Equivalente (BRL)¹ | IA | Dados locais |
|---|---|---:|---:|:---:|:---:|
| Logseq | Open source (sync em beta, sem cobrança) | US$ 0,00 | R$ 0,00 | Não | Sim |
| Obsidian | App gratuito + Sync Standard | US$ 4,00 (anual) / 5,00 (mensal) | R$ 20,60 / 25,75 | Não | Sim |
| Obsidian | Sync Plus | US$ 8,00 (anual) / 10,00 (mensal) | R$ 41,20 / 51,50 | Não | Sim |
| Capacities | Pro | US$ 9,99 | R$ 51,45 | Parcial | Não |
| Reflect | Único | US$ 10,00 (anual) | R$ 51,50 | Sim | Não |
| Mem | Pro | US$ 12,00 | R$ 61,80 | Sim | Não |
| Notion | Plus | US$ 10,00 (anual) / 12,00 (mensal) | R$ 51,50 / 61,80 | Trial limitado | Não |
| Notion | Business (IA completa) | US$ 20,00 (anual) / 24,00 (mensal) | R$ 103,00 / 123,60 | Sim | Não |

¹ Conversão pela cotação de referência **US$ 1,00 = R$ 5,15** (média do USD/BRL em 2026).

### Quadro 2 — Síntese da faixa de mercado

| Indicador | Valor (BRL/usuário/mês) | Referência |
|---|---:|---|
| **Mínimo** do setor (pago) | R$ 20,60 | Obsidian Sync Standard (sem IA) |
| **Máximo** do setor | R$ 123,60 | Notion Business mensal (com IA) |
| **Média** dos concorrentes **com IA** | ≈ R$ 57,00 | Capacities, Reflect, Mem, Notion Business |

### Conclusões da pesquisa

1. **Existe um "degrau de preço" da IA.** Ferramentas sem IA ficam entre R$ 0 e R$ 51; com IA
   completa, saltam para R$ 51–124. A IA é o atributo que o mercado já aceita pagar a mais.
2. **Nenhum concorrente entrega IA + dados locais ao mesmo tempo.** Confirma exatamente a lacuna
   apontada na atividade de empreendedorismo: *"a maioria ou é proprietária/em nuvem ou não integra
   busca por significado de forma nativa e local"*. Isso sustenta uma **estratégia de
   diferenciação**, e não uma guerra de preços.
3. **Todos cobram em dólar.** O público-alvo definido no Canvas — brasileiros de classe média e
   baixa — ainda paga variação cambial e IOF sobre essas assinaturas. Cobrar **em reais** é
   vantagem competitiva direta.
4. **Há concorrente gratuito (Logseq).** Isso reforça a necessidade do **plano Free**: competir em
   "preço zero" na camada do editor e monetizar apenas a camada de IA, que o Logseq não tem.
5. **Não copiar o preço do concorrente.** Conforme o material da disciplina, replicar ou
   simplesmente baratear o preço alheio é o erro mais comum — a pesquisa serve de **parâmetro**,
   mas o preço nasce do custo e da margem.

---

## 2. Estratégia competitiva escolhida

| Estratégia | Aplicação no VellumMD | Justificativa |
|---|---|---|
| **Custos/volume** (plano Pro) | Cota padrão, preço de entrada acessível, suporte por comunidade | Segmento do Canvas é sensível a preço; compensa margem menor com volume |
| **Diferenciação** (plano Studio) | Cota ampliada e suporte com SLA; único produto que une busca semântica por IA e soberania total dos dados | Atributo exclusivo; comporta margem e fator markup maiores |
| **Foco** (plano Campus) | Licenciamento para instituições de ensino, mínimo de 50 licenças | Público restrito e específico; margem menor justificada pelo lote |

> Conforme orienta o material, *"você pode utilizar um fator maior para os serviços mais
> exclusivos e outro fator menor em grande volume"* — é o que o portfólio da seção 8 faz.

**Receitas complementares** previstas no Canvas e mantidas aqui: **licenças institucionais** (plano
Campus) e **doações/patrocínio** (GitHub Sponsors), esta última sem markup por não ser contraprestação
de serviço.

---

## 3. Base de cálculo — Custos Unitários Diretos (CPV)

Os custos de IA foram apurados a partir do **preço oficial das APIs efetivamente usadas pelo
software** e do consumo dimensionado por cota.

### Quadro 3 — Parâmetros de custo das APIs de IA

| Serviço | Modelo usado no VellumMD | Preço (USD/1M tokens) |
|---|---|---:|
| Geração (assistente de IA) | Gemini 2.5 Flash — entrada | US$ 0,30 |
| Geração (assistente de IA) | Gemini 2.5 Flash — saída | US$ 2,50 |
| Busca semântica | gemini-embedding-001 (768 dimensões) | US$ 0,15 |

**Dimensionamento das cotas.** Para o custeio considera-se consumo médio planejado de **60% da
cota** (padrão de mercado em planos com cota) e proporção de 80% entrada / 20% saída na geração.

| Plano | Cota de geração | Cota de embeddings | Custo médio de IA |
|---|---:|---:|---:|
| Pro | 1.000.000 tokens/mês | 1.500.000 tokens/mês | R$ 3,50 |
| Studio | 2.000.000 tokens/mês | 3.000.000 tokens/mês | R$ 6,50 |

*Memória de cálculo (Studio):* geração (0,96M × US$ 0,30) + (0,24M × US$ 2,50) = US$ 0,89 →
R$ 4,57, provisionado R$ 5,20; embeddings 1,65M × US$ 0,15 = US$ 0,25 → R$ 1,27, provisionado
R$ 1,30.

### Quadro 4 — Custo Direto por Usuário/Mês (CPV)

| Item de custo direto | Pro (R$) | Studio (R$) | Campus (R$) |
|---|---:|---:|---:|
| APIs de IA — geração | 2,60 | 5,20 | 5,20 |
| APIs de IA — embeddings | 0,90 | 1,30 | 1,30 |
| Infraestrutura em nuvem | 2,80 | 2,80 | 2,30 |
| Suporte técnico direto | 0,70 | 2,20 | 0,20 |
| Distribuição e *code signing* | 0,50 | 0,50 | 0,00 |
| **CUSTO DIRETO POR USUÁRIO/MÊS (CPV)** | **7,50** | **12,00** | **9,00** |

**Notas:** o plano Pro opera com metade da cota do Studio e suporte apenas por comunidade/e-mail
(sem SLA). O plano Campus tem infraestrutura e suporte menores por ganho de escala — canal único
com o setor de TI da instituição e instalação por política corporativa.

---

## 4. Mapeamento de encargos e margem

### Quadro 5 — Percentuais sobre o preço de venda

| Componente | % | Composição |
|---|---:|---|
| **Despesas Variáveis (DV)** | **12%** | Impostos — Simples Nacional, Anexo III, 1ª faixa (6%) + gateway de pagamento e antifraude (6%) |
| **Despesas Fixas (DF)** | **28%** | Equipe de desenvolvimento e P&D, administrativo, contabilidade e marketing institucional |
| **Lucro Desejado (LP)** | **22% a 30%** | Varia conforme a estratégia competitiva de cada plano (ver seção 8) |

**Observações:**
- O enquadramento no **Anexo III** (6% na 1ª faixa) depende do **Fator R ≥ 28%** — folha de
  pagamento dividida pela receita bruta dos últimos 12 meses. Como o custo principal da empresa é
  a equipe de desenvolvimento, o Fator R é naturalmente atendido.
- O **DF de 28%** é superior ao exemplo-padrão (20%) porque em software o custo de
  desenvolvimento é o custo fixo dominante — coerente com o Canvas, que aponta "Desenvolvimento
  (tempo/pessoas) — custo fixo principal".
- O **DV de 12% pressupõe venda direta pelo site.** A venda via lojas de aplicativos muda
  radicalmente esse percentual — ver **seção 11.1**.

---

## 5. Cálculo do fator multiplicador (Markup)

**Fórmula oficial:**

```
Markup = 100 / [100 – (DV + DF + LP)]
```

**Plano Studio (diferenciação — fator maior):**

```
Soma dos percentuais: 12% + 28% + 30% = 70%

Markup = 100 / [100 – 70] = 100 / 30

FATOR MARKUP = 3,3333
```

**Plano Pro (volume — fator menor):**

```
Soma dos percentuais: 12% + 28% + 22% = 62%

Markup = 100 / [100 – 62] = 100 / 38

FATOR MARKUP = 2,6316
```

---

## 6. Formação do preço de venda

**Fórmula:** `Preço de Venda = Custo × Markup`

| Plano | Custo (CPV) | × Markup | = Preço calculado | **Preço de tabela** |
|---|---:|---:|---:|---:|
| **Pro** | R$ 7,50 | 2,6316 | R$ 19,74 | **R$ 19,90** |
| **Studio** | R$ 12,00 | 3,3333 | R$ 40,00 | **R$ 40,00** |

### 🏷 PREÇO DE TABELA — **R$ 19,90** (Pro) · **R$ 40,00** (Studio) por usuário/mês

O arredondamento do Pro de R$ 19,74 para R$ 19,90 é **arredondamento psicológico** e eleva
ligeiramente o lucro realizado (de 22,0% para 22,3%), conforme demonstrado na seção 7.

---

## 7. Prova real — decomposição da receita

### Quadro 6 — Demonstrativo por licença — **Plano Pro (R$ 19,90)**

| Linha do Demonstrativo | Participação (%) | Valor por Licença |
|---|---:|---:|
| Receita Bruta de Venda | 100% | R$ 19,90 |
| (–) Custos Unitários Diretos (CPV) | 37,7% | – R$ 7,50 |
| (–) Despesas Variáveis (DV — tributos/gateway) | 12,0% | – R$ 2,39 |
| (–) Despesas Fixas Rateadas (DF) | 28,0% | – R$ 5,57 |
| **(=) Lucro Líquido Realizado (LP)** | **22,3%** | **R$ 4,44** |

✅ R$ 7,50 + R$ 2,39 + R$ 5,57 + R$ 4,44 = R$ 19,90.

### Quadro 7 — Demonstrativo por licença — **Plano Studio (R$ 40,00)**

| Linha do Demonstrativo | Participação (%) | Valor por Licença |
|---|---:|---:|
| Receita Bruta de Venda | 100% | R$ 40,00 |
| (–) Custos Unitários Diretos (CPV) | 30% | – R$ 12,00 |
| (–) Despesas Variáveis (DV — tributos/gateway) | 12% | – R$ 4,80 |
| (–) Despesas Fixas Rateadas (DF) | 28% | – R$ 11,20 |
| **(=) Lucro Líquido Realizado (LP)** | **30%** | **R$ 12,00** |

✅ R$ 12,00 + R$ 4,80 + R$ 11,20 + R$ 12,00 = R$ 40,00.

---

## 8. Portfólio completo de planos

### Quadro 8 — Planos, custos e markup

| Plano | Estratégia | CPV (R$) | DV | DF | LP | Markup | Preço calculado | **Preço de tabela** |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **Free (Local)** | Aquisição (funil) | 0,00 | — | — | — | — | — | **R$ 0,00** |
| **Pro** | Custos / volume | 7,50 | 12% | 28% | 22% | 2,6316 | R$ 19,74 | **R$ 19,90** |
| **Studio** | Diferenciação | 12,00 | 12% | 28% | 30% | 3,3333 | R$ 40,00 | **R$ 40,00** |
| **Campus** (mín. 50 licenças) | Foco | 9,00 | 12% | 28% | 10% | 2,0000 | R$ 18,00 | **R$ 18,00** |

### Plano Free — a função estratégica do preço zero

O plano Free **não gera custo direto**: o aplicativo roda inteiramente na máquina do usuário, sem
backend. Ele existe como **funil de aquisição** — é a base dos 3% de conversão assumidos no pitch
deck. Também resolve a tensão identificada no Canvas entre atender **"classe média e baixa"** e
cobrar assinatura: **o uso local é gratuito; paga-se apenas pela cota de IA.**

### Pacote adicional de cota

Para o assinante que esgota a cota antes do fim do mês:

| Item | Cálculo | Preço |
|---|---|---:|
| Pacote de 1.000.000 tokens de IA | Custo R$ 3,90 × markup 3,3333 = R$ 13,00 | **R$ 12,90** |

---

## 9. Posicionamento do preço frente ao mercado

### Quadro 9 — VellumMD x concorrência (valores mensais em BRL)

| Produto | Preço (BRL) | IA | Dados locais | Cobrança em R$ |
|---|---:|:---:|:---:|:---:|
| Logseq | R$ 0,00 | Não | Sim | — |
| **VellumMD Free** | **R$ 0,00** | Não | **Sim** | — |
| **VellumMD Pro** | **R$ 19,90** | **Sim** | **Sim** | **Sim** |
| Obsidian Sync Standard | R$ 25,75 | Não | Sim | Não |
| **VellumMD Studio** | **R$ 40,00** | **Sim** | **Sim** | **Sim** |
| Capacities Pro | R$ 51,45 | Parcial | Não | Não |
| Reflect | R$ 51,50 | Sim | Não | Não |
| Mem Pro | R$ 61,80 | Sim | Não | Não |
| Notion Business | R$ 123,60 | Sim | Não | Não |

**Leitura estratégica:**

- O **Pro a R$ 19,90 é o único plano do mercado com IA abaixo de R$ 20,00** — e ainda fica abaixo
  do Obsidian Sync (R$ 25,75), que **não tem IA**. É a porta de entrada do segmento prioritário.
- O **Studio a R$ 40,00** fica **~30% abaixo da média dos concorrentes com IA (R$ 57,00)** e 67%
  abaixo do Notion Business, mantendo **30% de lucro líquido**: o preço é competitivo **por
  eficiência de custo**, não por sacrifício de margem.
- Nenhum dos dois entra em guerra de preços com o Logseq, porque a camada gratuita do VellumMD já
  compete em R$ 0,00 — a cobrança incide apenas sobre o atributo que o concorrente não possui.

---

## 10. Validação de margens e metas de venda

**Fórmula-chave:** `Receita = Preço de Venda × Quantidade Vendida`

### Quadro 10 — Margem de contribuição por plano

| Plano | Preço | (–) CPV | (–) DV | **Margem de Contribuição** | MC % |
|---|---:|---:|---:|---:|---:|
| Pro | R$ 19,90 | R$ 7,50 | R$ 2,39 | **R$ 10,01** | 50,3% |
| Studio | R$ 40,00 | R$ 12,00 | R$ 4,80 | **R$ 23,20** | 58,0% |
| Campus | R$ 18,00 | R$ 9,00 | R$ 2,16 | **R$ 6,84** | 38,0% |

### 10.1 Despesas fixas mensais estimadas

| Item | Valor mensal (R$) |
|---|---:|
| Equipe de desenvolvimento (2 sócios, pró-labore) | 12.000,00 |
| Infraestrutura base (fora do custo variável) | 800,00 |
| Ferramentas, domínio e certificado | 400,00 |
| Marketing institucional | 1.500,00 |
| Contabilidade | 500,00 |
| **Total de Despesas Fixas (DF)** | **15.200,00** |

### 10.2 Ponto de equilíbrio

```
Ponto de Equilíbrio = Despesas Fixas / Margem de Contribuição unitária

Só com plano Pro:     R$ 15.200,00 / R$ 10,01 = 1.519 assinantes
Só com plano Studio:  R$ 15.200,00 / R$ 23,20 =   656 assinantes
```

Ou qualquer combinação de planos que some **R$ 15.200,00 de margem de contribuição** no mês.

### 10.3 Validação da projeção do pitch deck ⭐

O pitch deck projeta receita a partir de uma base de usuários com **3% de conversão** e preço de
**R$ 19,90/mês**. Com a margem de contribuição agora calculada, é possível verificar se essa
projeção se sustenta:

| Base de usuários | Pagantes (3%) | Receita bruta/ano | MC/ano | (–) DF/ano | **Resultado anual** |
|---:|---:|---:|---:|---:|---:|
| 10.000 | 300 | R$ 71.640 | R$ 36.036 | R$ 182.400 | **– R$ 146.364** |
| 100.000 | 3.000 | R$ 716.400 | R$ 360.360 | R$ 182.400 | **+ R$ 177.960** |
| 1.000.000 | 30.000 | R$ 7.164.000 | R$ 3.603.600 | R$ 182.400 | **+ R$ 3.421.200** |

✅ **A receita bruta projetada no pitch deck confere exatamente** (300 × R$ 238,80 = R$ 71.640).

⚠️ **Mas o primeiro cenário dá prejuízo.** Convertendo o ponto de equilíbrio para a base do funil:

```
1.519 assinantes pagantes ÷ 3% de conversão = 50.633 usuários cadastrados
```

**Conclusão a levar para a banca:** o modelo só se paga a partir de **≈ 50 mil usuários na base
gratuita**. Abaixo disso, ou se eleva a conversão (plano Studio, campanhas), ou se reduzem as
despesas fixas na fase inicial.

### Quadro 11 — Cenários de meta de venda

| Cenário | Pro | Studio | Campus | Receita Bruta/mês | MC total/mês | (–) DF | **Resultado/mês** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Conservador** | 600 | 400 | 0 | R$ 27.940 | R$ 15.286 | 15.200 | **+ R$ 86** |
| **Realista** | 1.500 | 800 | 200 | R$ 65.450 | R$ 34.943 | 15.200 | **+ R$ 19.743** |
| **Otimista** | 4.000 | 2.000 | 1.000 | R$ 177.600 | R$ 93.280 | 28.000¹ | **+ R$ 65.280** |

¹ No cenário otimista as despesas fixas sobem para R$ 28.000 por ampliação da equipe.

**Meta operacional:** o cenário conservador fica praticamente no ponto de equilíbrio — portanto a
**meta mínima é de 1.000 assinantes pagantes**, sendo ao menos 400 no Studio. A meta de trabalho é
o cenário realista: **2.500 assinantes em 12 meses**.

---

## 11. Análise de sensibilidade e riscos

Precificação é um processo que exige *monitoramento e correção*. Quatro variáveis podem exigir
recálculo do markup.

### 11.1 Canal de venda — comissão das lojas de aplicativos ⚠️ (risco crítico)

O Canvas define canais **direto (site próprio)** e **indireto (lojas de aplicativos)**, e registra
taxas de loja de **15% a 30%**. Nas lojas, a comissão **substitui** o gateway (6%) e incide sobre o
preço cheio. Mantendo os preços de tabela:

| Canal | DV total | Lucro no Pro (R$ 19,90) | Lucro no Studio (R$ 40,00) |
|---|---:|---:|---:|
| **Site próprio** (6% tributo + 6% gateway) | 12% | R$ 4,44 (22,3%) | R$ 12,00 (30,0%) |
| Loja a 15% (6% + 15%) | 21% | R$ 2,65 (13,3%) | R$ 8,40 (21,0%) |
| Loja a 30% (6% + 30%) | 36% | **– R$ 0,33 (prejuízo)** | R$ 2,40 (6,0%) |

**Para preservar 30% de lucro vendendo em loja a 30%**, o markup do Studio iria a
`100 / [100 – (36 + 28 + 30)] = 100 / 6 = 16,67`, o que exigiria preço de **R$ 200,00** — inviável
frente ao mercado.

**Decisões recomendadas:**
1. **A venda direta pelo site é o canal primário obrigatório**, não uma alternativa.
2. **O plano Pro não deve ser vendido em loja com comissão de 30%** — dá prejuízo por licença.
3. Usar a loja apenas como **vitrine de aquisição**, levando a assinatura para o site (modelo
   "reader app"), ou restringi-la ao Studio, onde ainda sobra margem.
4. Observação já apontada no Canvas: *Apple Store* e *Play Store* são lojas **mobile**; sendo o
   VellumMD um app desktop (Electron), os canais corretos hoje são **Microsoft Store, Mac App
   Store e download direto**.

### 11.2 Mudança de faixa do Simples Nacional

No cenário realista, a receita bruta anual chega a **R$ 785.400**, deslocando a empresa da 1ª para
a **4ª faixa do Anexo III** (alíquota nominal 16%, parcela a deduzir R$ 35.640):

```
Alíquota efetiva = (785.400 × 16% – 35.640) / 785.400 = 11,46%
Novo DV = 11,46% (impostos) + 6% (gateway) = 17,5%

Studio: markup = 100 / [100 – (17,5 + 28 + 30)] = 100 / 24,5 = 4,0816 → R$ 48,98
Pro:    markup = 100 / [100 – (17,5 + 28 + 22)] = 100 / 32,5 = 3,0769 → R$ 23,08
```

**Decisão recomendada:** não repassar o aumento de uma só vez. Conforme o material da disciplina,
as margens devem ser ajustadas *"de forma quase imperceptível aos olhos do consumidor"* — reajustar
gradualmente o Pro para a faixa de **R$ 22,90** e o Studio para **R$ 44,90–47,90**, absorvendo a
diferença com o ganho de escala na negociação das APIs de IA.

### 11.3 Variação cambial

As APIs de IA são cobradas em dólar e representam **54% do CPV** (R$ 6,50 de R$ 12,00 no Studio):

| Cotação USD | Custo de IA (Studio) | Novo CPV | Preço Studio necessário |
|---|---:|---:|---:|
| R$ 5,15 (base) | R$ 6,50 | R$ 12,00 | R$ 40,00 |
| R$ 6,00 | R$ 7,57 | R$ 13,07 | R$ 43,57 |
| R$ 7,00 | R$ 8,83 | R$ 14,33 | R$ 47,77 |

**Mitigação:** cota em tokens (e não uso ilimitado), o que permite prever o teto de custo por
usuário. É também a vantagem de cobrar em reais enquanto os concorrentes cobram em dólar.

### 11.4 Usuário acima da média de consumo

Um assinante Studio que consome 100% da cota custa cerca de **R$ 9,94 em IA** — geração de 2M
tokens (US$ 1,48) mais embeddings de 3M tokens (US$ 0,45) — contra os R$ 6,50 provisionados. Isso
eleva o CPV de R$ 12,00 para R$ 15,44 e reduz a MC de R$ 23,20 para **R$ 19,76** (49,4%).

**Mitigação:** a cota é um **teto rígido** — ao esgotá-la, o usuário compra o pacote adicional de
R$ 12,90, que já embute o markup integral. Assim o excesso de consumo **gera receita em vez de
prejuízo**.

---

## 12. Síntese

| Pergunta | Resposta |
|---|---|
| Qual a estratégia competitiva? | **Diferenciação** no Studio, **volume** no Pro, **foco** no Campus |
| Qual o custo direto por licença? | **R$ 7,50** (Pro) · **R$ 12,00** (Studio) · **R$ 9,00** (Campus) |
| Qual o fator markup? | **2,6316** (Pro) · **3,3333** (Studio) · **2,0000** (Campus) |
| Qual o preço de venda? | **R$ 19,90** (Pro) · **R$ 40,00** (Studio) · **R$ 18,00** (Campus) |
| Qual o lucro líquido por licença? | **R$ 4,44 (22,3%)** no Pro · **R$ 12,00 (30%)** no Studio |
| Qual o ponto de equilíbrio? | **1.519 assinantes Pro** ou **656 Studio** (MC de R$ 15.200/mês) |
| Quantos usuários na base gratuita? | **≈ 50.633** usuários, a 3% de conversão |
| Qual a meta de vendas em 12 meses? | **2.500 assinantes pagantes** (cenário realista) |
| Qual o maior risco? | **Comissão das lojas de aplicativos** — a 30%, o plano Pro dá prejuízo |

---

## Referências

GOOGLE. **Gemini API pricing**. Disponível em: https://ai.google.dev/gemini-api/docs/pricing.
Acesso em: 23 out. 2026.

GOOGLE DEVELOPERS. **Gemini Embedding now generally available in the Gemini API**. Disponível em:
https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/. Acesso em: 23 out. 2026.

NOTION. **Pricing**. Disponível em: https://www.notion.com/pricing. Acesso em: 23 out. 2026.

OBSIDIAN. **Obsidian Sync pricing**. Disponível em: https://obsidian.md/sync. Acesso em: 23 out. 2026.

CONTABILIZEI. **Anexo III Simples Nacional: tabela completa, atividades, alíquotas e cálculos**.
Disponível em: https://www.contabilizei.com.br/contabilidade-online/anexo-3-simples-nacional/.
Acesso em: 23 out. 2026.

AGILIZE. **Simples Nacional para software: Anexo III ou V?**. Disponível em:
https://agilize.com.br/artigos/. Acesso em: 23 out. 2026.

GREGUI, Rafael. **Precificação**. Material didático da disciplina de Administração de Empresas e
Empreendedorismo, 2026.
