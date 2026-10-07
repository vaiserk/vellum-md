# Business Model Canvas — VellumMD (completo)

**Disciplina:** Administração de Empresas e Empreendedorismo

Este documento parte do Canvas que **você já preencheu** (Proposta de Valor, Segmentos de
Clientes, Canais e Fontes de Receita) e **completa os blocos que faltavam** (Parceiros-Chave,
Atividades-Chave, Recursos-Chave, Relacionamento e Estrutura de Custos), mantendo coerência
com a sua decisão de modelo de receita: **assinatura com cotas de uso do serviço de IA e de
geração de embeddings**. Isso significa que o negócio **hospeda/intermedia a IA** — portanto,
o custo da IA é um custo do negócio (variável), e não do usuário.

Ao final há uma seção de **sugestões de melhoria** para os blocos que você escreveu.

---

## Quadro completo

| PARCEIROS-CHAVE | ATIVIDADES-CHAVE | PROPOSTA DE VALOR | RELACIONAMENTO | SEGMENTOS DE CLIENTES |
|---|---|---|---|---|
| **(completado)** Provedores de IA/embeddings (Google Gemini/Gemma, OpenAI, Anthropic, Groq); provedor de nuvem (backend de cotas); gateway de pagamento; lojas de aplicativos; projetos open-source que compõem o app (Electron, CodeMirror, unified/remark, KaTeX, Mermaid) | **(completado)** Desenvolver e manter o app; operar o serviço de IA/embeddings (sistema de cotas e intermediação das APIs); gerir assinaturas e faturamento; dar suporte e publicar atualizações; divulgar o produto | **(seu)** Buscar entre as notas não só por palavras-chave, mas de forma **semântica** (pelo significado), facilitando a recuperação do conteúdo. Suporte a fórmulas matemáticas, IA como assistente e exportação para vários formatos (PDF, slides e site estático em HTML) | **(completado)** Autosserviço (app local + onboarding guiado); automatizado (gestão de cotas/assinatura e atualizações); suporte reativo por e-mail/site para assinantes; comunidade para engajamento e retenção | **(seu)** Pessoas de 16 a 40 anos, classe média e baixa, brasileiras de médias a grandes cidades. Estudantes de tecnologia, engenharias e outros cursos superiores, ou profissionais que desejam organizar seu conhecimento de forma estruturada |
| | **RECURSOS-CHAVE** — **(completado)** software e código-fonte (ativo principal); equipe de desenvolvimento; backend de cotas de IA (servidores + contratos/chaves com os provedores); tecnologia de indexação/busca semântica; marca e base de usuários | | **CANAIS** — **(seu)** Direto: venda pelo site próprio. Indireto: lojas de aplicativos (ex.: Apple Store e Play Store) | |
| **ESTRUTURA DE CUSTOS** — **(completado)** Desenvolvimento (tempo/pessoas — custo fixo principal); **APIs de IA e embeddings** (principal custo variável, proporcional ao uso dos assinantes); infraestrutura em nuvem (backend de cotas); taxas de gateway de pagamento e das lojas (~15–30%); assinatura de certificado de código; marketing ||| **FONTES DE RECEITA** — **(seu)** Assinatura de planos que disponibilizam cotas para uso do serviço de IA e de geração de embeddings para a pesquisa semântica ||

---

## Blocos completados (detalhe)

### Parceiros-Chave
- **Provedores de IA e embeddings** (Google Gemini/Gemma, OpenAI, Anthropic, Groq) — parceria mais crítica, pois a receita depende de revender cotas desses serviços.
- **Provedor de infraestrutura em nuvem** — hospeda o backend que controla as cotas e intermedia as chamadas de IA.
- **Gateway de pagamento** — processa as assinaturas.
- **Lojas de aplicativos** — canal de distribuição (conforme seus canais).
- **Projetos de código aberto** que formam a base do app (Electron, CodeMirror, unified/remark, KaTeX, Mermaid).

### Atividades-Chave
- **Desenvolver e manter** o aplicativo.
- **Operar o serviço de IA/embeddings**: sistema de cotas, intermediação das APIs e controle de uso.
- **Gerir assinaturas e faturamento.**
- **Suporte ao cliente e atualizações.**
- **Marketing e divulgação** em comunidades de estudo e produtividade.

### Recursos-Chave
- **Software e código-fonte** (principal ativo intelectual).
- **Equipe de desenvolvimento** (Electron, IA, UX).
- **Backend de cotas de IA** — servidores e os contratos/chaves de API com os provedores.
- **Tecnologia de busca semântica** (indexação por embeddings).
- **Marca e base de usuários.**

### Relacionamento com os Clientes
*(Respondendo à pergunta-guia "que tipo de relação cada segmento espera?")* O público-alvo —
estudantes e profissionais — espera **autonomia e agilidade**, logo o modelo é de
**autosserviço**: o app roda localmente e traz um onboarding guiado. A relação é
**automatizada** na gestão da assinatura, das cotas e das atualizações, com **suporte
reativo** (e-mail/site) quando o assinante precisa e **comunidade** para engajamento e
retenção. Como conquistar um cliente custa mais do que manter, a transparência sobre o
consumo de cotas é parte da estratégia de retenção.

### Estrutura de Custos
- **Desenvolvimento** (tempo/pessoas) — custo fixo principal.
- **APIs de IA e embeddings** — **principal custo variável**, cresce com o uso dos assinantes.
- **Infraestrutura em nuvem** do backend de cotas.
- **Taxas** do gateway de pagamento e das lojas de aplicativos (~15–30%).
- **Certificado de assinatura de código** (instaladores confiáveis).
- **Marketing.**

> **Ponto de viabilidade:** como a IA é o principal custo variável, o preço/cota de cada
> plano precisa cobrir, com margem, o custo médio de IA por usuário. Esse é o número-chave a
> validar no seu modelo.

---

## Sugestões de melhoria (nos blocos que você escreveu)

**1. Proposta de Valor**
- **Inclua a privacidade / *local-first***: é o diferencial central do seu TCC e está ausente do bloco. Algo como *"seus dados ficam no seu computador, em formato aberto (Markdown)"*. Isso te diferencia de Notion/Google Docs.
- **Revisar redação:** *"Suporte a fórmulas matemáticas aparando o uso"* parece ter um erro de digitação — talvez *"apoiando a escrita técnica"* ou *"ampliando o uso acadêmico"*.
- **Destaque o benefício-fim, não só as funções:** o valor não é "ter busca semântica", e sim *"reduzir o tempo e o esforço para reencontrar e reaproveitar o que você já anotou"*.

**2. Segmentos de Clientes**
- **Coerência com a receita:** "classe **baixa**" + assinatura paga é uma tensão — quem tem menos renda tende a não assinar. Sugestão: adotar **freemium** (uso local gratuito; paga-se apenas pela cota de IA). Assim o segmento de menor renda ainda usa o produto e você monetiza quem quer IA.
- Está muito bom já ter faixa etária, região e perfil — dá para transformar isso numa **persona** ("Lucas, 22, estudante de Engenharia...").

**3. Canais**
- **Atenção:** o VellumMD é um app **desktop** (Electron). *Apple Store* e *Play Store* são de **celular**. Se não há versão mobile, o correto seria **Microsoft Store, Mac App Store e download direto no site**. Se você pretende lançar mobile no futuro, deixe isso explícito como *plano futuro* — fica mais honesto para a banca.

**4. Fontes de Receita**
- Modelo coerente e bem pensado. Sugestões: (a) combinar com **freemium** (grátis local, pago = cota de IA), o que resolve a tensão do segmento; (b) considerar **plano institucional** (faculdades/escolas) como receita secundária; (c) explicitar que a cota precisa ser dimensionada **com margem sobre o custo de IA**.

**5. Relacionamento** — estava em branco; preenchi acima. Vale copiá-lo para o seu quadro.
