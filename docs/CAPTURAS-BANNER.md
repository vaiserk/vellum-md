# Capturas de tela para o banner do TCC

Checklist do que precisa ser fotografado no aplicativo para preencher os espaços
tracejados do banner (`docs/banner/VELLUMMD_Banner_v2.pptx`).

São **4 capturas de tela** + **2 logos** + **1 QR Code** (opcional).

---

## Antes de começar

### 1. Abrir o app

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npx electron .
```

A partir da raiz do projeto. Problemas? Ver [`COMO-RODAR.md`](COMO-RODAR.md).

### 2. Abrir o vault de demonstração

**Abrir Vault** → selecionar `docs/banner/vault-demo`

São 6 notas prontas que exercitam exatamente o que o banner precisa mostrar:
fórmulas LaTeX, diagramas Mermaid, wikilinks, tabelas e checklists.

> ⚠️ **Não use seu vault pessoal.** Suas notas reais ficariam impressas no banner.

### 3. Conferir que está em modo claro

O app agora **segue o tema do Windows** automaticamente. Se o seu Windows estiver
em modo claro, não precisa fazer nada. Caso contrário, clique no ícone de
**lua/sol** na barra lateral (ou `Ctrl+P` → digite `tema` → `Enter`).

> Banner é impresso em papel branco — tela escura gasta tinta e perde legibilidade.

### 4. Maximizar a janela

Cada captura ocupa **19,5 cm** de largura no banner. A 150 dpi isso exige no
mínimo **1.150 px** de largura. Maximizada em Full HD dá ~1.550 px — suficiente.

---

## As 4 capturas

### 1️⃣ `01-editor.png` — Editor com pré-visualização

| | |
|---|---|
| **Como chegar** | Abrir a nota **`00 - Demonstracao.md`** → `Ctrl+\` até ficar no **modo dividido** |
| **Enquadrar** | Nada a rolar — a nota foi feita para caber inteira na tela |
| **Tem que aparecer** | Fórmula (KaTeX), diagrama (Mermaid), tabela, checklist e wikilink |

> É a captura mais importante do banner. A nota `00 - Demonstracao.md` foi escrita
> justamente para isso: é curta de propósito, para que o código-fonte (esquerda) e
> o resultado renderizado (direita) apareçam **inteiros num único print**, sem rolagem.
>
> Ela demonstra de uma vez: título, **negrito**, *itálico*, fórmula LaTeX, diagrama
> Mermaid horizontal, tabela, lista de tarefas, `código inline` e wikilink.
>
> Se mesmo assim não couber, diminua a fonte em `Ctrl+,` → Configurações, ou remova
> a tabela da nota.

---

### 2️⃣ `02-busca-semantica.png` — Busca semântica

| | |
|---|---|
| **Como chegar** | Ícone de **lupa** 🔍 na barra lateral → esperar a indexação terminar |
| **Buscar por** | `como reduzir o esforço de lembrar das coisas` |
| **Tem que aparecer** | A caixa de busca com o texto digitado **e** os resultados listados |

> ⚠️ **Precisa de chave de API** configurada em `Ctrl+,`. Sem chave não há resultado.

**Por que essa frase:** nenhuma dessas palavras existe literalmente nas notas, mas
a busca deve trazer *Carga Cognitiva* e *Segundo Cérebro*. É a prova visual da tese
do trabalho — **recuperação por significado, não por palavra exata**. Se funcionar,
essa imagem sozinha defende o projeto.

---

### 3️⃣ `03-assistente-ia.png` — Assistente de IA

| | |
|---|---|
| **Como chegar** | `Ctrl+Shift+A` |
| **Perguntar** | `Resuma a relação entre carga cognitiva e busca semântica nas minhas notas` |
| **Tem que aparecer** | A pergunta **e** a resposta completa, com o editor visível ao lado |

> O editor ao lado importa: mostra que a IA trabalha *dentro* do fluxo de escrita,
> sem tirar o usuário do contexto.

---

### 4️⃣ `04-exportacao.png` — Exportação multiformato

| | |
|---|---|
| **Como chegar** | Com uma nota aberta, `Ctrl+Shift+E` |
| **Tem que aparecer** | As três opções lado a lado: **PDF**, **HTML** e **Apresentação** |

> É o *omni-export* citado no resumo enviado ao evento.

---

## Logos e QR Code

| Arquivo | Posição no banner | Onde conseguir |
|---|---|---|
| `logo-unifev.png` | Topo **esquerdo** | Site/portal da UNIFEV. De preferência PNG com fundo transparente |
| `logo-vellummd.png` | Topo **direito** | O ícone do app (📜). Dá para recortar da tela inicial |
| `qrcode.png` | Rodapé esquerdo *(opcional)* | Gerar apontando para o repositório no GitHub |

---

## Como tirar as fotos

Deixei um script que recorta **só a janela do app**, sem barra de tarefas:

```powershell
cd docs\banner
.\capturar.ps1 -Nome 01-editor
```

Ele dá 5 segundos para você clicar na janela do VellumMD e salva em
`docs/banner/imagens/01-editor.png`. **Não clica nem digita nada** — só fotografa.

*Alternativa manual:* `Alt + PrtScn` copia a janela ativa → colar no Paint → salvar.

---

## Como colocar no banner

1. Abrir `docs/banner/VELLUMMD_Banner_v2.pptx` no PowerPoint
2. **Botão direito** no quadro tracejado → **Alterar Imagem** → **Deste Dispositivo**
3. Escolher a imagem

> Use **Alterar Imagem** em vez de apagar e inserir — assim a posição e o tamanho
> do espaço são preservados e o alinhamento do banner não quebra.

Se a imagem distorcer: **Formatar Imagem → Cortar → Preencher**.

---

## Checklist final

**Capturas**
- [ ] `01-editor.png` — fórmula **e** diagrama renderizados juntos
- [ ] `02-busca-semantica.png` — resultados que **não** contêm as palavras buscadas
- [ ] `03-assistente-ia.png` — pergunta **e** resposta visíveis
- [ ] `04-exportacao.png` — os três formatos lado a lado

**Imagens**
- [ ] `logo-unifev.png`
- [ ] `logo-vellummd.png`
- [ ] `qrcode.png` (opcional)

**Qualidade**
- [ ] Todas em modo claro
- [ ] Todas com pelo menos 1.150 px de largura
- [ ] Nenhuma informação pessoal visível
- [ ] Vault de demonstração, não o pessoal

**Conferir no banner antes de imprimir**
- [ ] Instituição correta (está como *Centro Universitário de Votuporanga — UNIFEV*)
- [ ] Curso correto (está como *Engenharia de Computação*)
- [ ] Titulação da orientadora (está como *Profa. Dra.*)
- [ ] Texto revisado pela orientadora
