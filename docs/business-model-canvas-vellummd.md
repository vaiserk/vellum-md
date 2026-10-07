# Business Model Canvas — VellumMD

**Disciplina:** Administração de Empresas e Empreendedorismo
**Projeto:** VellumMD — editor de Markdown local-first com busca semântica e assistência por IA

> Observação: conforme o material da aula, o Canvas registra **hipóteses** de modelo de
> negócio — suposições de planejamento a serem validadas junto aos clientes, não verdades
> definitivas. O VellumMD é um projeto de código aberto; o modelo de receita abaixo é uma
> possibilidade de sustentação, não um fim comercial já implementado.

## Visão geral do Canvas

| Parcerias Principais | Atividades-Chave | Proposta de Valor | Relacionamento | Segmento de Clientes |
|---|---|---|---|---|
| Provedores de IA (Google, OpenAI, Anthropic, Groq); projetos open-source (Electron, CodeMirror, KaTeX, Mermaid); comunidades PKM e instituições de ensino; plataformas de distribuição (GitHub, Microsoft Store) | Desenvolver e manter o software; integrar e curar modelos de IA; documentar e dar suporte; divulgar em comunidades | Encontrar notas pelo **significado** (não pela palavra exata); **privacidade total** (dados locais, LGPD); IA integrada à escrita; suporte técnico (LaTeX, Mermaid, wikilinks); exportação multiformato; formato aberto sem aprisionamento | Autosserviço (app local + onboarding); comunidade open-source; suporte via GitHub; atualizações automáticas | Estudantes (escrita técnica/acadêmica); profissionais do conhecimento; entusiastas de "segundo cérebro" que valorizam privacidade |
| | **Recursos Principais** | | **Canais** | |
| | Código-fonte (PI); equipe de desenvolvimento; comunidade e marca; infraestrutura de distribuição | | Site/landing do projeto; repositório GitHub; lojas de apps; redes sociais e comunidades de PKM | |
| **Estrutura de Custos** ||| **Fontes de Receita** ||
| Desenvolvimento (principal custo: tempo/pessoas); assinatura de código (*code signing*); site/distribuição; divulgação. **Custo de IA ≈ zero para o negócio** (usuário usa a própria chave de API) ||| Núcleo gratuito/open-source; possível versão premium (sincronização criptografada opcional, temas, suporte); doações/patrocínio; licenças para instituições de ensino ||

---

## Detalhamento dos 9 blocos

### 1. Segmento de Clientes
- **Estudantes** universitários e de pós-graduação que produzem muita escrita técnica e acadêmica.
- **Profissionais do conhecimento**: pesquisadores, desenvolvedores, escritores técnicos.
- **Entusiastas de PKM / "segundo cérebro"** preocupados com privacidade e controle dos dados.
- **Persona principal:** estudante de engenharia/TI que escreve bastante, usa fórmulas e diagramas, e não quer seus dados em nuvem de terceiros.

### 2. Proposta de Valor
- **Busca por significado:** reencontrar o que já foi anotado mesmo sem lembrar as palavras exatas.
- **Privacidade por design:** notas ficam só no computador do usuário, em conformidade com a LGPD; funciona offline.
- **Assistência cognitiva:** IA integrada resume, organiza, explica e conecta ideias sem sair do editor.
- **Suporte técnico/acadêmico:** LaTeX, diagramas Mermaid e wikilinks nativos.
- **Omni-export:** PDF, apresentação e site a partir de uma única fonte Markdown.
- **Sem aprisionamento:** arquivos em Markdown puro — o usuário leva seus dados quando quiser.

### 3. Canais
- **Diretos:** site/landing page do projeto e repositório no GitHub (download do instalador).
- **Lojas:** Microsoft Store e agregadores de software open-source.
- **Comunidade e divulgação:** redes sociais, fóruns e comunidades de produtividade/PKM (boca a boca).

### 4. Relacionamento com os Clientes
- **Autosserviço:** o app é local e traz assistente de primeira execução (*onboarding*).
- **Comunidade:** projeto open-source — usuários reportam problemas e contribuem via GitHub.
- **Automatizado:** atualizações e documentação.
- **Foco em retenção:** interface simples e dados do próprio usuário reduzem o custo de troca.

### 5. Fontes de Receita *(hipótese)*
- **Freemium:** núcleo gratuito e aberto; versão paga opcional (sincronização criptografada entre dispositivos, temas, suporte prioritário).
- **Doações/patrocínio:** GitHub Sponsors.
- **Licenças institucionais:** planos para escolas e universidades.
- **Vantagem-chave:** o usuário fornece a própria chave de API — o **custo da IA não recai sobre o negócio**.

### 6. Recursos Principais
- O **software e o código-fonte** (principal ativo intelectual).
- **Equipe de desenvolvimento** (conhecimento técnico em Electron, IA e UX).
- **Comunidade e marca** do projeto.
- **Infraestrutura** de distribuição (site, repositório).

### 7. Atividades-Chave
- **Desenvolvimento e manutenção** contínuos do aplicativo.
- **Integração e curadoria** dos modelos de IA e da busca semântica.
- **Documentação e suporte** à comunidade.
- **Divulgação** em comunidades de escrita e produtividade.

### 8. Parcerias Principais
- **Provedores de IA:** Google (Gemini/Gemma), OpenAI, Anthropic e Groq — fornecem os modelos via API.
- **Projetos open-source base:** Electron, CodeMirror, unified/remark, KaTeX, Mermaid, Reveal.js.
- **Comunidades de PKM e instituições de ensino** (adoção e feedback).
- **Plataformas de distribuição:** GitHub e lojas de aplicativos.

### 9. Estrutura de Custos
- **Desenvolvimento** (tempo/pessoas) — o custo mais relevante.
- **Assinatura de código** (*code signing*) para instaladores confiáveis.
- **Site e distribuição** (custo baixo).
- **Divulgação/marketing.**
- **Custo de IA ≈ zero para o negócio**, pois é pago pelo próprio usuário — grande vantagem de custo do modelo.
