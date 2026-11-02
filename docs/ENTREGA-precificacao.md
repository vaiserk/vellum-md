# Estratégia de Precificação — VellumMD

**Aluno:** Otavio Freitas dos Santos
**Disciplina:** Administração de Empresas e Empreendedorismo
**Professor:** Rafael Gregui
**Data:** outubro de 2026

---

## Apresentação do produto

O **VellumMD** é um editor de notas em Markdown para desktop que funciona **localmente** — os
arquivos ficam no computador do usuário, em formato aberto. Seu diferencial é a **busca
semântica por inteligência artificial**: o usuário reencontra o que anotou pelo **significado**,
e não pela palavra exata, além de contar com um assistente de IA integrado ao editor.

**Modelo de negócio (definido no Business Model Canvas):** **freemium**. O uso local é gratuito;
a receita vem da **assinatura que libera cotas de uso de IA e de geração de embeddings**. Como o
negócio hospeda e intermedia as APIs de IA, **o custo da IA é custo direto do negócio** — é essa
decisão que torna o cálculo de markup aplicável ao produto.

---

# 1. ESTRATÉGIA DE PRECIFICAÇÃO

## 1.1 Pesquisa de mercado

Antes de formar o preço, pesquisou-se a concorrência para obter a visão de **máximos e mínimos**
praticados no setor.

**Quadro 1 — Preços dos concorrentes (out/2026)**

| Concorrente | Plano | USD/mês | **BRL/mês**¹ | IA | Dados locais |
|---|---|---:|---:|:---:|:---:|
| Logseq | Open source | 0,00 | **0,00** | Não | Sim |
| Obsidian | Sync Standard | 5,00 | **25,75** | Não | Sim |
| Obsidian | Sync Plus | 10,00 | **51,50** | Não | Sim |
| Capacities | Pro | 9,99 | **51,45** | Parcial | Não |
| Reflect | Único | 10,00 | **51,50** | Sim | Não |
| Mem | Pro | 12,00 | **61,80** | Sim | Não |
| Notion | Plus | 12,00 | **61,80** | Trial | Não |
| Notion | Business | 24,00 | **123,60** | Sim | Não |

¹ Cotação de referência: US$ 1,00 = R$ 5,15.

**Quadro 2 — Faixa do mercado**

| Indicador | Valor | Referência |
|---|---:|---|
| Mínimo pago do setor | R$ 25,75 | Obsidian Sync (sem IA) |
| Máximo do setor | R$ 123,60 | Notion Business (com IA) |
| **Média dos concorrentes com IA** | **R$ 57,00** | Capacities, Reflect, Mem, Notion |

**Conclusões:**
1. Existe um **"degrau de preço da IA"**: ferramentas sem IA custam até R$ 51; com IA, saltam
   para R$ 51 a R$ 124. A IA é o atributo que o mercado já aceita pagar a mais.
2. **Nenhum concorrente entrega IA e dados locais ao mesmo tempo** — é a lacuna que o VellumMD
   ocupa.
3. **Todos cobram em dólar**; o público-alvo brasileiro ainda paga variação cambial e IOF.
4. **Existe concorrente gratuito (Logseq)**, o que torna o plano Free necessário.

## 1.2 Estratégias competitivas adotadas

Conforme o material da disciplina, *"pode-se utilizar um fator maior para os serviços mais
exclusivos e outro fator menor em grande volume"*. O portfólio aplica **três estratégias
diferentes**:

**Quadro 3 — Estratégia por plano**

| Plano | Estratégia competitiva | Justificativa |
|---|---|---|
| **Free** | Aquisição (funil) | Compete em R$ 0,00 com o Logseq; gera a base para conversão |
| **Pro** | **Custos / volume** | Segmento-alvo (classe média e baixa) é sensível a preço; margem menor compensada por volume |
| **Studio** | **Diferenciação** | Único produto com IA + soberania de dados; atributo exclusivo comporta margem maior |
| **Campus** | **Foco** | Instituições de ensino, mínimo de 50 licenças; público restrito, margem menor justificada pelo lote |

## 1.3 Posicionamento

O preço **não foi copiado da concorrência** — foi formado a partir do custo e da margem, usando
a pesquisa apenas como parâmetro de competitividade. O resultado posiciona o produto **abaixo da
média do mercado com IA sem sacrificar a margem**, por eficiência de custo.

---

# 2. DESPESAS E CUSTOS

## 2.1 Custos unitários diretos (CPV)

Os custos de IA foram apurados pelo **preço oficial das APIs efetivamente utilizadas pelo
software**, com consumo dimensionado por cota (consumo médio planejado de 60% da cota).

**Quadro 4 — Preço das APIs de IA**

| Serviço | Modelo | Preço (USD / 1M tokens) |
|---|---|---:|
| Geração — entrada | Gemini 2.5 Flash | 0,30 |
| Geração — saída | Gemini 2.5 Flash | 2,50 |
| Busca semântica | gemini-embedding-001 (768 dim.) | 0,15 |

**Quadro 5 — Custo Direto por Usuário/Mês (CPV)**

| Item de custo direto | **Pro** | **Studio** | **Campus** |
|---|---:|---:|---:|
| APIs de IA — geração | R$ 2,60 | R$ 5,20 | R$ 5,20 |
| APIs de IA — embeddings | R$ 0,90 | R$ 1,30 | R$ 1,30 |
| Infraestrutura em nuvem (backend de cotas) | R$ 2,80 | R$ 2,80 | R$ 2,30 |
| Suporte técnico direto | R$ 0,70 | R$ 2,20 | R$ 0,20 |
| Distribuição e *code signing* | R$ 0,50 | R$ 0,50 | R$ 0,00 |
| **CUSTO DIRETO POR USUÁRIO/MÊS (CPV)** | **R$ 7,50** | **R$ 12,00** | **R$ 9,00** |

> O plano Free não gera custo direto: o aplicativo roda inteiramente na máquina do usuário,
> sem backend.

## 2.2 Despesas fixas mensais

**Quadro 6 — Despesas fixas (DF)**

| Item | Valor mensal |
|---|---:|
| Equipe de desenvolvimento (2 sócios, pró-labore) | R$ 12.000,00 |
| Infraestrutura base | R$ 800,00 |
| Ferramentas, domínio e certificado digital | R$ 400,00 |
| Marketing institucional | R$ 1.500,00 |
| Contabilidade | R$ 500,00 |
| **TOTAL DE DESPESAS FIXAS** | **R$ 15.200,00** |

## 2.3 Mapeamento percentual

**Quadro 7 — Percentuais sobre o preço de venda**

| Componente | % | Composição |
|---|---:|---|
| **Despesas Variáveis (DV)** | **12%** | Impostos (Simples Nacional, Anexo III, 1ª faixa: 6%) + gateway de pagamento e antifraude (6%) |
| **Despesas Fixas (DF)** | **28%** | Equipe de desenvolvimento e P&D, administrativo, contabilidade e marketing |
| **Lucro Desejado (LP)** | **22% a 30%** | Varia conforme a estratégia competitiva de cada plano |

**Observações:**
- O enquadramento no **Anexo III** (6%) depende do **Fator R ≥ 28%**. Como o custo principal da
  empresa é a folha da equipe de desenvolvimento, o Fator R é naturalmente atendido.
- O **DF de 28%** supera o padrão de 20% porque, em software, o desenvolvimento é o custo fixo
  dominante.
- O **DV de 12% pressupõe venda direta pelo site próprio** (canal primário).

---

# 3. CÁLCULO DO MARKUP

**Fórmula oficial:**

```
Markup = 100 / [100 – (DV + DF + LP)]
```

### Plano Pro — estratégia de volume (fator menor)

```
Soma dos percentuais:  12% + 28% + 22% = 62%

Markup = 100 / [100 – 62]
Markup = 100 / 38

FATOR MARKUP = 2,6316
```

### Plano Studio — estratégia de diferenciação (fator maior)

```
Soma dos percentuais:  12% + 28% + 30% = 70%

Markup = 100 / [100 – 70]
Markup = 100 / 30

FATOR MARKUP = 3,3333
```

### Plano Campus — estratégia de foco (venda em lote)

```
Soma dos percentuais:  12% + 28% + 10% = 50%

Markup = 100 / [100 – 50]
Markup = 100 / 50

FATOR MARKUP = 2,0000
```

---

# 4. FORMAÇÃO DO PREÇO DE VENDA

**Fórmula:** `Preço de Venda = Custo × Markup`

**Quadro 8 — Aplicação do markup**

| Plano | Custo (CPV) | × Markup | = Preço calculado | **PREÇO DE TABELA** |
|---|---:|---:|---:|---:|
| Free | R$ 0,00 | — | — | **R$ 0,00** |
| **Pro** | R$ 7,50 | 2,6316 | R$ 19,74 | **R$ 19,90** |
| **Studio** | R$ 12,00 | 3,3333 | R$ 40,00 | **R$ 40,00** |
| **Campus** (mín. 50 licenças) | R$ 9,00 | 2,0000 | R$ 18,00 | **R$ 18,00** |

> O arredondamento do Pro de R$ 19,74 para R$ 19,90 é arredondamento psicológico e eleva o lucro
> realizado de 22,0% para 22,3%.

## 4.1 Prova real — decomposição da receita

**Quadro 9 — Plano Pro (R$ 19,90/usuário/mês)**

| Linha do Demonstrativo | Participação | Valor por Licença |
|---|---:|---:|
| Receita Bruta de Venda | 100,0% | R$ 19,90 |
| (–) Custos Unitários Diretos (CPV) | 37,7% | – R$ 7,50 |
| (–) Despesas Variáveis (tributos/gateway) | 12,0% | – R$ 2,39 |
| (–) Despesas Fixas Rateadas | 28,0% | – R$ 5,57 |
| **(=) LUCRO LÍQUIDO REALIZADO** | **22,3%** | **R$ 4,44** |

✅ R$ 7,50 + R$ 2,39 + R$ 5,57 + R$ 4,44 = **R$ 19,90**

**Quadro 10 — Plano Studio (R$ 40,00/usuário/mês)**

| Linha do Demonstrativo | Participação | Valor por Licença |
|---|---:|---:|
| Receita Bruta de Venda | 100% | R$ 40,00 |
| (–) Custos Unitários Diretos (CPV) | 30% | – R$ 12,00 |
| (–) Despesas Variáveis (tributos/gateway) | 12% | – R$ 4,80 |
| (–) Despesas Fixas Rateadas | 28% | – R$ 11,20 |
| **(=) LUCRO LÍQUIDO REALIZADO** | **30%** | **R$ 12,00** |

✅ R$ 12,00 + R$ 4,80 + R$ 11,20 + R$ 12,00 = **R$ 40,00**

## 4.2 Comparação com o mercado

**Quadro 11 — Posicionamento do preço**

| Produto | Preço/mês | IA | Dados locais | Cobrança em R$ |
|---|---:|:---:|:---:|:---:|
| Logseq | R$ 0,00 | Não | Sim | — |
| **VellumMD Free** | **R$ 0,00** | Não | **Sim** | — |
| **VellumMD Pro** | **R$ 19,90** | **Sim** | **Sim** | **Sim** |
| Obsidian Sync | R$ 25,75 | Não | Sim | Não |
| **VellumMD Studio** | **R$ 40,00** | **Sim** | **Sim** | **Sim** |
| Capacities / Reflect | R$ 51,50 | Sim/Parcial | Não | Não |
| Mem Pro | R$ 61,80 | Sim | Não | Não |
| Notion Business | R$ 123,60 | Sim | Não | Não |

- O **Pro (R$ 19,90)** é o **único plano do mercado com IA abaixo de R$ 20,00** — e custa menos
  que o Obsidian Sync, que **não tem IA**.
- O **Studio (R$ 40,00)** fica **30% abaixo da média dos concorrentes com IA** (R$ 57,00) e 67%
  abaixo do Notion Business, **mantendo 30% de lucro líquido**.

---

# 5. RECEITAS ESTIMADAS

**Fórmula-chave:** `Receita = Preço de Venda × Quantidade Vendida`

## 5.1 Margem de contribuição

**Quadro 12 — Margem de contribuição por plano**

| Plano | Preço | (–) CPV | (–) DV | **Margem de Contribuição** | MC % |
|---|---:|---:|---:|---:|---:|
| Pro | R$ 19,90 | R$ 7,50 | R$ 2,39 | **R$ 10,01** | 50,3% |
| Studio | R$ 40,00 | R$ 12,00 | R$ 4,80 | **R$ 23,20** | 58,0% |
| Campus | R$ 18,00 | R$ 9,00 | R$ 2,16 | **R$ 6,84** | 38,0% |

## 5.2 Ponto de equilíbrio

```
Ponto de Equilíbrio = Despesas Fixas ÷ Margem de Contribuição unitária

Somente com plano Pro:     R$ 15.200,00 ÷ R$ 10,01 = 1.519 assinantes
Somente com plano Studio:  R$ 15.200,00 ÷ R$ 23,20 =   656 assinantes
```

Ou qualquer combinação de planos que totalize **R$ 15.200,00 de margem de contribuição por mês**.

Convertendo para a base do funil freemium (taxa de conversão de 3%):

```
1.519 assinantes ÷ 3% = 50.633 usuários cadastrados na base gratuita
```

## 5.3 Receita estimada por cenário

**Quadro 13 — Cenários de meta de venda**

| Cenário | Pro | Studio | Campus | **Receita Bruta/mês** | **Receita Bruta/ano** | MC/mês | (–) DF | **Resultado/mês** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Conservador** | 600 | 400 | 0 | **R$ 27.940** | R$ 335.280 | R$ 15.286 | R$ 15.200 | **+ R$ 86** |
| **Realista** | 1.500 | 800 | 200 | **R$ 65.450** | R$ 785.400 | R$ 34.943 | R$ 15.200 | **+ R$ 19.743** |
| **Otimista** | 4.000 | 2.000 | 1.000 | **R$ 177.600** | R$ 2.131.200 | R$ 93.280 | R$ 28.000¹ | **+ R$ 65.280** |

¹ No cenário otimista as despesas fixas sobem para R$ 28.000 pela ampliação da equipe.

## 5.4 Receita estimada pelo funil freemium

Projeção a partir da base de usuários, com conversão de 3% e ticket do plano Pro
(R$ 19,90 × 12 = R$ 238,80/ano):

**Quadro 14 — Projeção pelo funil**

| Base de usuários | Pagantes (3%) | **Receita bruta/ano** | Margem de contribuição/ano | (–) DF/ano | **Resultado anual** |
|---:|---:|---:|---:|---:|---:|
| 10.000 | 300 | R$ 71.640 | R$ 36.036 | R$ 182.400 | **– R$ 146.364** |
| 50.633 | 1.519 | R$ 362.738 | R$ 182.462 | R$ 182.400 | **R$ 0 (equilíbrio)** |
| 100.000 | 3.000 | R$ 716.400 | R$ 360.360 | R$ 182.400 | **+ R$ 177.960** |
| 1.000.000 | 30.000 | R$ 7.164.000 | R$ 3.603.600 | R$ 182.400 | **+ R$ 3.421.200** |

## 5.5 Metas de venda

| Meta | Quantidade | Prazo |
|---|---:|---|
| **Meta mínima** (ponto de equilíbrio) | 1.000 assinantes pagantes, sendo ≥ 400 no Studio | 6 meses |
| **Meta de trabalho** (cenário realista) | 2.500 assinantes pagantes | 12 meses |
| **Base gratuita necessária** | ≈ 50.000 usuários cadastrados | 12 meses |

---

# 6. CONSIDERAÇÕES FINAIS

A precificação do VellumMD partiu do **mapeamento real dos custos** — inclusive do preço oficial
das APIs de IA efetivamente usadas pelo software — e não da simples cópia do preço da
concorrência, prática apontada no material da disciplina como o erro mais comum do mercado.

O resultado é um portfólio com **três fatores de markup distintos** (2,0000, 2,6316 e 3,3333),
cada um alinhado a uma estratégia competitiva, permitindo que o produto seja **simultaneamente
acessível ao segmento-alvo e lucrativo**.

Três pontos de atenção para o acompanhamento do negócio:

1. **Canal de venda.** O DV de 12% pressupõe venda direta pelo site. As lojas de aplicativos
   cobram de 15% a 30% de comissão; a 30%, o plano Pro passaria a operar com prejuízo de
   R$ 0,33 por licença. **A venda direta é, portanto, o canal primário obrigatório.**
2. **Faixa tributária.** No cenário realista a receita anual atinge R$ 785.400, deslocando a
   empresa para a 4ª faixa do Anexo III (alíquota efetiva de 11,46%). O DV subiria para 17,5% e
   os preços precisariam ser reajustados gradualmente para R$ 22,90 (Pro) e R$ 44,90 a 47,90
   (Studio).
3. **Variação cambial.** As APIs de IA são cobradas em dólar e representam 54% do CPV. O uso de
   **cotas em tokens** (e não de uso ilimitado) é a proteção que permite prever o teto de custo
   por usuário.

Conforme ensina o material da disciplina, a precificação é um **processo** que exige execução,
análise, monitoramento e correção — e as margens devem ser ajustadas *"de forma quase
imperceptível aos olhos do consumidor"* para manter a competitividade.

---

## Referências

AGILIZE. **Simples Nacional para software: Anexo III ou V?**. Disponível em:
https://agilize.com.br/artigos/. Acesso em: 23 out. 2026.

CONTABILIZEI. **Anexo III Simples Nacional: tabela completa, atividades, alíquotas e cálculos**.
Disponível em: https://www.contabilizei.com.br/contabilidade-online/anexo-3-simples-nacional/.
Acesso em: 23 out. 2026.

GOOGLE. **Gemini API pricing**. Disponível em: https://ai.google.dev/gemini-api/docs/pricing.
Acesso em: 23 out. 2026.

GOOGLE DEVELOPERS. **Gemini Embedding now generally available in the Gemini API**. Disponível
em: https://developers.googleblog.com/en/gemini-embedding-available-gemini-api/.
Acesso em: 23 out. 2026.

GREGUI, Rafael. **Precificação**. Material didático da disciplina de Administração de Empresas e
Empreendedorismo. Curitiba, 2026.

NOTION. **Pricing**. Disponível em: https://www.notion.com/pricing. Acesso em: 23 out. 2026.

OBSIDIAN. **Obsidian Sync pricing**. Disponível em: https://obsidian.md/sync.
Acesso em: 23 out. 2026.
