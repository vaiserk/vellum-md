# Roteiro de capturas de tela — Capítulo 4

Caminho ordenado para fotografar **todo** o VellumMD e suas funcionalidades, de
modo que cada captura entre no capítulo como evidência de um requisito já
especificado no [Capítulo 3](../CAP3/Capitulo-3-Modelagem-e-Desenvolvimento.md).

---

## 1. Qual é o capítulo que falta desenvolver

O Capítulo 3 (*Modelagem e Desenvolvimento*) já está escrito e fecha dizendo que
os artefatos ali apresentados "fundamentam o desenvolvimento descrito nas seções
seguintes". O que falta, portanto, é o capítulo que **mostra o sistema
funcionando, tela por tela**.

Nos TCCs da UNIFEV usados como referência, esse capítulo aparece com dois nomes
— e é sempre o maior do trabalho:

| TCC | Cap. | Como se chama | Extensão |
|---|---|---|---|
| PhotoFind (Bessa e Mazotti, 2025) — *bom modelo* | 5 | DESENVOLVIMENTO → **5.1 Telas da Aplicação** | 47 páginas, 95 figuras |
| SPOTCLICK (Hugo e Sérgio) | 5 | **RESULTADOS** → 5.1 Tela de login, 5.2 Tela de cadastro, … | uma subseção por tela e por estado |
| Ruiz (telemetria agrícola) | 4 | DESENVOLVIMENTO → **4.3 Interface do Usuário** | + arquitetura e estratégia de testes |

Os três convergem: **o capítulo de telas é o corpo do trabalho**, e a prova de
que o software existe. Nos três ele também vem acompanhado de uma seção de
arquitetura/tecnologia e de uma de testes.

### Estrutura proposta para o seu Capítulo 4

Como o Capítulo 3 já consumiu requisitos, casos de uso, classes, sequência e
ferramentas, o Capítulo 4 fica só com a implementação e a evidência:

```
4 DESENVOLVIMENTO
  4.1  Visão geral da interface
  4.2  Primeira execução e configuração inicial
  4.3  Gestão do vault e das notas
  4.4  Edição
  4.5  Pré-visualização e renderização
  4.6  Organização e navegação entre notas
  4.7  Busca léxica e busca semântica
  4.8  Assistência por inteligência artificial
  4.9  Preferências de interface
  4.10 Exportação
  4.11 Confiabilidade, segurança e distribuição
  4.12 Considerações do capítulo
```

As rodadas de captura deste roteiro seguem exatamente essa ordem.

> 📌 **Numeração das figuras.** O Capítulo 3 termina na **Figura 4** e no
> **Quadro 11**. Se os capítulos 1 e 2 não tiverem figuras, o Capítulo 4 começa
> na **Figura 5**. Confira antes de numerar.

---

## 2. O padrão da UNIFEV para cada figura

Todos os modelos repetem o mesmo bloco de três partes. Copie esta estrutura:

```
    A Figura 12 apresenta a árvore de navegação do vault. As notas são listadas
recursivamente a partir da pasta escolhida pelo usuário, com subpastas
recolhíveis, atendendo ao requisito RF02.


Figura 12 – Árvore de notas do vault

                         [ imagem ]

Fonte: elaborado pelo autor (2026).
```

Regras extraídas dos modelos:

1. **Sempre um parágrafo antes da figura**, abrindo com "A Figura N apresenta…",
   "Conforme a Figura N…" ou "Como evidenciado na Figura N…". Nunca uma figura
   solta.
2. **Título curto acima** da imagem; legenda de fonte **abaixo**, em corpo menor.
3. **Granularidade alta.** O PhotoFind dedica figura separada a cada seção de uma
   mesma página e depois uma figura de "tela completa" consolidando. Estados
   intermediários — formulário preenchido, confirmação, mensagem de erro — também
   ganham figura própria. Faça o mesmo: **um estado, uma figura**.
4. **Ao final de cada tela**, uma figura de visão completa.
5. No seu caso, acrescente ao parágrafo **o RF que a figura evidencia**. Nenhum
   dos modelos faz essa amarração, e é ela que transforma o capítulo em
   verificação de requisitos em vez de álbum de telas.

---

## 3. Preparação (uma vez, antes de começar)

### 3.1 O vault de captura

**Não use seu vault pessoal.** Além da privacidade, notas reais poluem as
capturas com conteúdo irrelevante.

Use **`docs/CAP4/vault-demo2`**, preparado especificamente para estas capturas.
São 19 notas curtas (a maioria cabe numa tela sem rolagem) em três subpastas,
descritas em [`VAULT-DEMO2.md`](VAULT-DEMO2.md). Ele já atende ao que o antigo
`docs/banner/vault-demo` não atendia:

| Necessidade | Como o vault-demo2 resolve |
|---|---|
| Buscas com resultado crível | 19 notas, contra 7 do anterior |
| Painel de tags povoado | 6 tags recorrentes, todas as notas com `tags:` |
| Backlinks com lista real | 6 notas apontam para `[[Segundo Cerebro]]` |
| Hierarquia visível na árvore | subpastas `Pesquisa/`, `Aulas/`, `Diario/` |
| Nota que cabe numa captura só | `01 - Panorama` reúne fórmula, diagrama, tabela e tarefas |

### 3.2 Tela, janela e tema

- **Tema claro.** A monografia é impressa; tela escura come tinta e perde
  legibilidade no papel. Guarde o tema escuro só para a captura **A42**, que é o
  comparativo.
- **Janela maximizada** em Full HD (1920×1080) → ~1.550 px úteis, suficiente para
  uma figura de página inteira a 150 dpi.
- **Zoom do app em 100%** (`Ctrl+0`, ou menu Exibir → Tamanho normal).
- **DevTools fechado** em todas as capturas.

### 3.3 O que nunca pode aparecer

| ⛔ | Por quê |
|---|---|
| Chave de API legível | Fica impressa e vai para a biblioteca; a chave vaza de verdade |
| Notas pessoais, nomes de terceiros, e-mails | LGPD — e o RNF01 promete privacidade |
| Barra de tarefas com seus outros programas | Ruído visual e exposição desnecessária |
| Caminhos com dados pessoais | Prefira um vault em `C:\VellumMD-Demo` |

Para a captura de Configurações › IA (**B01**), **troque a chave** por um valor
falso do mesmo formato antes de fotografar, ou confirme que o campo está
mascarado.

### 3.4 Ferramenta de captura e nomes de arquivo

- **`Win + Shift + S`** → recorte retangular. Permite excluir a barra de tarefas
  e recortar detalhes (barra de ferramentas, barra de status) sem redimensionar a
  janela.
- Salvar em **PNG** (JPG borra texto pequeno).
- Pasta: **`docs/CAP4/capturas/`**
- Nome: **`<ID>-descricao-curta.png`** — ex.: `A07-janela-principal.png`

O ID é o da primeira coluna das tabelas da seção 4. Ele não muda se você pular
uma captura opcional, ao contrário do número da figura — por isso o arquivo usa o
ID, e o número da figura só é atribuído na montagem do documento.

### 3.5 Como reexibir o assistente de primeira execução

As capturas **A01–A04** só existem na primeira execução. Para reproduzi-las, vá
em menu **Exibir → Ferramentas do desenvolvedor → Console** e rode:

```js
localStorage.removeItem('vellum-onboarding-done'); location.reload()
```

Feche o DevTools antes de fotografar.

---

## 4. O caminho

Quatro rodadas, e a ordem entre elas **não é arbitrária**:

| Rodada | Estado do app | Por que nesta ordem |
|---|---|---|
| **A** | Sem chave de API | As capturas **A44**, **A45** e o índice vazio **deixam de existir** depois de configurar a chave. Começar pela IA perde a evidência de que o app funciona sem ela — justamente o que o RNF07 promete |
| **B** | Com chave configurada | Indexação, busca semântica e IA |
| **C** | Exportação | Precisa de uma nota rica, já pronta das rodadas A e B |
| **D** | App instalado | Não alimenta nenhuma outra, por isso vai no fim da lista — mas acontece **amanhã**, no trabalho. Só D01 e D02 exigem a instalação; as demais saem no `win-unpacked` |

> A ordem acima é de **dependência**, não de calendário. Na prática: amanhã
> saem **D01 e D02** (instalador e ícone), e as rodadas A, B e C acontecem em
> casa, no `release\win-unpacked\VellumMD.exe`, na ordem em que estão aqui.

★ = **evidência primária de um requisito**. São 55 das 85 entradas, e esse
conjunto sozinho já cobre **todos os 28 RF e todos os RNF** da matriz da seção 5
— conferido um por um. As outras 30 são reforço: estados intermediários e telas
complementares que deixam o capítulo mais sólido, mas cuja ausência não abre
buraco na cobertura. Se o tempo apertar, corte entre as sem estrela.

---

### Rodada A — sem chave de API

#### 4.2 Primeira execução e configuração inicial

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A01 | Assistente de configuração inicial | Reset do onboarding (3.5) | Card de boas-vindas e os 4 pontos de progresso | RF28 |
| ★A02 | Seleção do vault no assistente | Passo 2 | Botão de escolha de pasta e o caminho selecionado | RF01 |
| A03 | Configuração opcional de IA no assistente | Passo 3 | Campos de provedor e chave **vazios** e o botão de pular | RF23 |
| A04 | Conclusão do assistente | Passo 4 | Mensagem de pronto | — |
| ★A05 | Tela inicial sem vault aberto | Primeira abertura | Logo, frase de apresentação, botões Abrir Vault e Configurações | RF01 |
| A06 | Diálogo do sistema para escolha do vault | Clicar em Abrir Vault | Janela **nativa** do Windows — integração com o SO | RF01 |

#### 4.1 Visão geral da interface

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A07 | Janela principal do VellumMD | Vault aberto, nota rica ativa, layout dividido | As três regiões ao mesmo tempo: barra lateral, editor, pré-visualização — e a barra de status | RF06, RF08 |
| A07b | Regiões da interface *(opcional)* | A mesma imagem de A07 | Mesma captura com **números 1–4** sobrepostos no Word e a legenda explicando cada região | RNF09 |

> A07 é a figura mais importante do capítulo. Escolha uma nota que mostre
> heading, negrito, fórmula, diagrama e lista de tarefas **na mesma tela** — a
> nota `00 - Demonstracao.md` foi feita para isso.

#### 4.3 Gestão do vault e das notas

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A08 | Árvore de notas do vault | Aba 📁, pastas expandidas | Hierarquia com ao menos duas subpastas e a nota ativa destacada | RF02 |
| A09 | Hierarquia de pastas recolhida | Clicar nas setas | A mesma árvore colapsada — prova o recolhimento | RF02 |
| ★A10 | Criação de nota com escolha de pasta | `Ctrl+N` | Campo de nome e o seletor de pasta aberto, com as subpastas indentadas | RF03 |
| A11 | Nota criada com frontmatter | Confirmar a criação | Editor com `title`, `created`, `modified`, `tags`, `aliases` | RF03 |
| ★A12 | Menu de contexto da nota | Botão direito sobre uma nota | As quatro ações: Renomear, Mover para…, Excluir, Nova nota | RF04, RF05 |
| A13 | Renomeação de nota | Menu → Renomear | Modal com o nome atual preenchido | RF04 |
| A14 | Movimentação de nota entre pastas | Menu → Mover para… | Seletor de pasta de destino | RF02 |
| A15 | Confirmação de exclusão de nota | Menu → Excluir | Modal de confirmação citando o nome da nota | RF05 |
| ★A16 | Desfazer exclusão na barra de status | Confirmar a exclusão | Banner com o nome da nota e a contagem regressiva do Desfazer | RF05 |
| ★A17 | Lixeira interna | Esperar o banner sumir → ícone 🗑 | Lista de notas excluídas com o botão de restaurar | RF05 |
| A18 | Nota restaurada | Restaurar na lixeira | A nota de volta na árvore | RF05 |

#### 4.4 Edição

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A19 | Editor com realce de sintaxe Markdown | Nota com heading, negrito, itálico, lista, citação | Cores distintas por elemento | RF06 |
| ★A20 | Barra de ferramentas do editor | Recorte só da barra | Os 15 botões; se possível com um *tooltip* visível | RF06 |
| ★A21 | Comandos de barra no editor | Digitar `/` em linha vazia | Lista suspensa com `/latex`, `/mermaid`, `/table`, `/callout`… | RF14 |
| ★A22 | Paleta de comandos global | `Ctrl+P` | Lista de comandos e o campo de filtro | RF14 |
| ★A23 | Autocompletar de wikilink | Digitar `[[` | Sugestões de notas do vault | RF11 |
| ★A24 | Fórmula LaTeX renderizada no editor | Nota com `$$…$$` | A fórmula **renderizada dentro do editor**, não só no preview | RF09 |
| ★A25 | Diagrama Mermaid renderizado no editor | Nota com bloco `mermaid` | O diagrama desenhado embutido no editor | RF10 |
| A26 | Tabela renderizada no editor | `/table` e preencher | A tabela formatada no editor | RF06 |
| A27 | Modo de foco (*typewriter*) | `Ctrl+P` → "Typewriter" | Linha ativa centralizada, demais esmaecidas | RF28 |
| ★A29 | Barra de status com contadores | Nota longa aberta | Palavras, caracteres, tempo de leitura, posição do cursor, modo de layout | RF06 |
| ★A30 | Estados do salvamento automático | Digitar e fotografar duas vezes | Par de recortes: **● Salvando…** e **✓ Salvo** | RF07 |

> **A30** é um par de imagens numa única figura (lado a lado no Word, legendadas
> "(a)" e "(b)"). É assim que os modelos tratam estados sequenciais.

#### 4.5 Pré-visualização e renderização

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A31 | Pré-visualização da nota | Layout dividido | Editor e preview lado a lado, **com o mesmo trecho visível nos dois** | RF08 |
| ★A32 | Blocos de destaque (*callouts*) | Nota com `[!NOTE]`, `[!WARNING]`, `[!TIP]` | Pelo menos três tipos, com cores diferentes | RF13 |
| ★A33 | Lista de tarefas interativa | Marcar um checkbox no preview | Itens marcados e desmarcados; diga no texto que o clique **grava no arquivo** | RF13 |
| A34 | Fórmulas na pré-visualização | — | Fórmula de bloco e fórmula em linha | RF09 |
| A35 | Diagrama na pré-visualização | — | Diagrama Mermaid renderizado | RF10 |
| A36 | Realce de código na pré-visualização | Bloco de código com linguagem | Palavras-chave coloridas | RF08 |
| A37 | Imagem incorporada à nota | `![alt](arquivo.png)` | Imagem exibida no preview | RF08 |
| ★A41 | Modos de exibição | `Ctrl+\` três vezes | **Três capturas** numa figura: dividido, somente editor, somente pré-visualização | RF28 |
| ★A42 | Tema claro e tema escuro | Botão de tema na barra lateral | **Duas capturas** da mesma tela, legendadas (a) e (b) | RF28 |

#### 4.6 Organização e navegação entre notas

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A38 | Navegação por wikilink | Clicar num `[[link]]` no preview | **Duas capturas**: nota de origem e nota de destino aberta | RF11 |
| ★A39 | Backlinks da nota ativa | Aba 🔗 | Lista com **4+ notas** que referenciam a nota aberta | RF12 |
| ★A40 | Organização e filtragem por tags | Aba 🏷️ | Lista de tags e, abaixo, as notas filtradas pela tag selecionada | RF15 |

#### 4.7 Busca — parte sem IA

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A43 | Busca léxica por termos | Aba 🔍 → uma palavra só, ex.: `zettelkasten` | Resultados com a etiqueta **Léxica** e o trecho correspondente | RF16 |
| ★B07a | *(primeira metade de B07)* | Aba 🔍 → a frase *como reduzir o esforço de lembrar das coisas* | **Nenhum resultado** — ainda sem índice semântico | RF16 |
| ★A44 | Busca semântica sem chave configurada | Aba 🔍 **antes** de configurar a chave | Mensagem explicando o que falta — **sem erro e sem tela branca** | RF23 |
| ★A45 | Assistente de IA sem chave configurada | `Ctrl+Shift+A` antes da chave | Mensagem clara sobre a chave ausente | RF23 |

#### 4.11 Confiabilidade, segurança e privacidade *(parte local)*

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★A46 | Abertura de link externo no navegador do sistema | Clicar num link `https://` no preview | **Duas capturas**: o link na nota e o navegador aberto, com o app intacto atrás | RNF08 |
| ★A47 | Detecção de alteração externa no vault | Abrir uma nota no Bloco de Notas, alterar e salvar | Bloco de Notas e VellumMD lado a lado, com a mudança já refletida | RF24 |
| ★A48 | Notas como arquivos Markdown no sistema de arquivos | Explorador do Windows na pasta do vault | Arquivos `.md` visíveis e um deles aberto no Bloco de Notas, legível | RNF02 |

> **A48 vale mais do que parece.** É a única figura que prova fisicamente a
> soberania de dados que o trabalho defende: sem banco, sem formato
> proprietário, sem nuvem. Merece parágrafo próprio.

---

### Rodada B — com chave de API configurada

#### 4.9 Preferências e configuração da IA

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★B01 | Configurações de inteligência artificial | `Ctrl+,` → Inteligência Artificial | Provedor, modelo e a chave **mascarada ou falsa** | RF23 |
| ★B02 | Configurações de busca semântica | `Ctrl+,` → Busca Semântica | Provedor de embedding, modelo e status do índice | RF17, RF23 |
| ★B17 | Preferências do editor | `Ctrl+,` → Editor | Tamanho da fonte, tipografia, números de linha, intervalo de salvamento | RF28 |
| B18 | Preferências de exportação | `Ctrl+,` → Exportação | Formato e orientação do PDF | RF25 |
| A28 | Números de linha no editor | Ativar em Configurações → Editor | Editor com a coluna de números | RF28 |

#### 4.7 Busca semântica

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★B03 | Indexação semântica em andamento | Logo após configurar a chave | O contador no formato "Indexando… 11/21" | RF18 |
| B04 | Índice semântico concluído | Configurações → Busca Semântica | Status do índice com a contagem de notas indexadas | RF18 |
| ★B05 | Cache do índice no sistema de arquivos | Explorador em `.vellum/embeddings.json` | O arquivo no disco; mencione que notas não modificadas **não são reenviadas** | RF18 |
| ★B06 | Busca semântica por significado | Aba 🔍 → consulta em linguagem natural | A consulta (ex.: *como reduzir o esforço de lembrar das coisas*) e as notas encontradas **sem conter essas palavras** | RF17 |
| ★B07 | Busca léxica e busca semântica para a mesma consulta | Repetir **exatamente** a consulta de B07a, agora com o índice pronto | **Duas capturas** lado a lado: B07a (vazia) e esta (resultados pertinentes, com o percentual) | RF16, RF17 |

> **B07 é a figura-tese do trabalho.** Mostra, numa imagem, o problema que o
> VellumMD resolve.
>
> **Atenção à ordem:** a busca léxica do app compara a consulta inteira como
> trecho literal do texto, não termo a termo. Uma frase longa, portanto, nunca
> retorna resultado léxico — e é justamente isso que torna a comparação honesta.
> Mas as duas metades da figura são capturadas **em momentos diferentes**: a
> vazia (**B07a**) ainda na Rodada A, antes de existir índice; a cheia aqui.
> Se você configurar a chave antes de tirar B07a, a metade vazia deixa de
> existir — as duas buscas passam a aparecer na mesma lista unificada.

#### 4.8 Assistência por inteligência artificial

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★B08 | Assistente de IA com contexto da nota | `Ctrl+Shift+A` | Painel ao lado do editor, com pergunta sobre a nota ativa e a resposta | RF20 |
| B09 | Resposta exibida progressivamente | Fotografar **durante** a resposta | Resposta incompleta — evidência do *streaming* | RF20 |
| ★B10 | Ações rápidas de IA | Painel de IA | As nove ações: Expandir, Resumir, Corrigir, Organizar, Perguntas, Flashcards, Diagrama, Tabela, Callout | RF21 |
| ★B11 | Diagrama gerado por IA | Ação Diagrama → inserir na nota | **Duas capturas**: o Mermaid gerado e o diagrama já renderizado | RF21 |
| B12 | Tabela e flashcards gerados por IA | Ações Tabela e Flashcards | Tabela Markdown renderizada no preview | RF21 |
| ★B13 | Ações de IA sobre trecho selecionado | Selecionar texto → **botão direito** no editor | Menu com Reescrever seleção, Explicar, Traduzir para PT-BR | RF22 |
| B14 | Resultado da transformação do trecho | Aplicar "Traduzir" ou "Reescrever" | Antes e depois do parágrafo | RF22 |
| ★B15 | Sugestão automática de conexões | Escrever 30+ caracteres sobre tema de outra nota | A faixa de sugestão de wikilink aparecendo durante a escrita | RF19 |
| B16 | Nota criada com conteúdo inicial por IA | `Ctrl+N` → opção de gerar com IA | O modal com a opção marcada e, depois, a nota gerada com frontmatter e tags | RF03 |

---

### Rodada C — exportação

Use uma nota rica (fórmula + diagrama + código + tabela + imagem) para que cada
saída prove que **tudo** sobreviveu à conversão.

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★C01 | Exportação para PDF | `Ctrl+Shift+E` → aba PDF | Opções de formato e orientação | RF25 |
| C02 | Nome de arquivo sugerido na exportação | Confirmar a exportação | Diálogo nativo com o nome **da nota** já preenchido | RF25 |
| ★C03 | PDF gerado | Abrir o PDF | Página com fórmula, diagrama e código **preservados** | RF25 |
| ★C04 | Fatiamento da nota em slides | Aba Slides | Prévia das divisões de slide | RF26 |
| C05 | Editor de slides | Aba Slides → editar | A edição dos slides antes de exportar | RF26 |
| ★C06 | Apresentação gerada | Abrir a apresentação no navegador | Um slide com fórmula ou diagrama renderizado | RF26 |
| ★C07 | Exportação do vault como site | Aba Site | Opções de exportação | RF27 |
| ★C08 | Capa do site gerado | Abrir o `index.html` | Capa com a lista de notas | RF27 |
| C09 | Navegação no site gerado | Clicar numa nota | Nota renderizada com índice/navegação | RF27 |
| ★C10 | Uma fonte Markdown, três saídas | Composição no Word | **Quatro painéis**: a nota no app, o PDF, o slide e o site | RNF12 |

> **C10** fecha o capítulo. Sustenta o RNF12 e dá o encerramento visual — vale a
> página inteira.

---

### Rodada D — aplicação instalada (na máquina de teste)

Feita com o instalador, seguindo [`TESTE-EM-OUTRA-MAQUINA.md`](../TESTE-EM-OUTRA-MAQUINA.md).

> ⏰ **É a última na lista, mas a primeira no calendário.** As rodadas estão
> ordenadas por dependência: A alimenta B, que alimenta C. A rodada D não
> alimenta nenhuma, por isso ficou no fim — mas acontece **amanhã, no trabalho**,
> junto do teste do instalador. É a única ocasião barata de fotografar o
> aplicativo instalado.
>
> Só **duas** destas capturas exigem de fato a instalação: **D01** e **D02**.
> As outras cinco saem igual no `win-unpacked`, em casa, junto das rodadas A–C.
> Se amanhã o tempo for curto, **tire D01 e D02 e deixe o resto para depois**.

| ID | Título sugerido da figura | Como chegar | Precisa aparecer no quadro | RF |
|---|---|---|---|---|
| ★D01 | Instalador da aplicação | Executar o `Setup` — **só amanhã** | Tela do instalador | RNF03 |
| D02 | Ícone e atalho da aplicação no Windows | Área de trabalho / menu Iniciar — **só amanhã** | Atalho com o ícone próprio | RNF03 |
| D03 | Menu da aplicação | Barra de menus (qualquer build) | Arquivo, Editar, Exibir, Janela, Ajuda — em português | RNF09 |
| ★D04 | Manual de ajuda embutido | `F1` (qualquer build) | Janela do manual com a navegação lateral | RNF09 |
| D05 | Identificação da versão | Ajuda → Sobre o VellumMD (qualquer build) | Diálogo com o número da versão | — |
| ★D06 | Operação sem conexão com a internet | Desligar o Wi-Fi e usar o app (qualquer build) | App editando e renderizando normalmente, com o Wi-Fi visivelmente desligado | RNF07 |
| D07 | Tela de recuperação de erro *(oportunista)* | Difícil de provocar de propósito | Se acontecer durante os testes, **fotografe** | RNF06 |

> **D06** merece encenação: deixe o ícone de rede do Windows visível na captura,
> mostrando o "sem internet". A imagem só prova algo se a ausência de rede
> estiver no quadro.

---

## 5. Matriz de cobertura — requisito × figura

Serve para fechar o capítulo sem buraco: todo RF do Capítulo 3 precisa ter, no
Capítulo 4, ao menos uma figura que o evidencie.

| RF | Requisito | Capturas |
|---|---|---|
| RF01 | Abrir vault | A02, A05, A06 |
| RF02 | Listar notas | A08, A09, A14 |
| RF03 | Criar nota | A10, A11, B16 |
| RF04 | Renomear nota | A12, A13 |
| RF05 | Excluir e restaurar nota | A12, A15, A16, A17, A18 |
| RF06 | Editar nota | A19, A20, A26, A29 |
| RF07 | Salvamento automático | A30 |
| RF08 | Pré-visualização | A31, A36, A37 |
| RF09 | Fórmulas matemáticas | A24, A34 |
| RF10 | Diagramas | A25, A35 |
| RF11 | Wikilinks | A23, A38 |
| RF12 | Backlinks | A39 |
| RF13 | Callouts e tarefas | A32, A33 |
| RF14 | Comandos rápidos | A21, A22 |
| RF15 | Organização por tags | A40 |
| RF16 | Busca léxica | A43, B07a, B07 |
| RF17 | Busca semântica | B02, B06, B07 |
| RF18 | Indexação incremental | B03, B04, B05 |
| RF19 | Sugestão de conexões | B15 |
| RF20 | Assistente de IA | B08, B09 |
| RF21 | Ações rápidas de IA | B10, B11, B12 |
| RF22 | Ação de IA no texto | B13, B14 |
| RF23 | Configurar IA | A03, A44, A45, B01, B02 |
| RF24 | Monitorar o vault | A47 |
| RF25 | Exportar para PDF | B18, C01, C02, C03 |
| RF26 | Exportar apresentação | C04, C05, C06 |
| RF27 | Exportar site | C07, C08, C09 |
| RF28 | Preferências de interface | A01, A27, A28, A41, A42, B17 |

| RNF | Categoria | Capturas |
|---|---|---|
| RNF02 | Portabilidade de dados | A48 |
| RNF03 | Portabilidade de plataforma | D01, D02 |
| RNF06 | Resiliência | A44, A45, D07 |
| RNF07 | Operação offline | D06 |
| RNF08 | Segurança | A46 |
| RNF09 | Usabilidade | A07b, D03, D04 |
| RNF12 | Interoperabilidade | C10 |

**Total: 85 entradas** — 84 capturas mais a variante opcional A07b —, das quais
**55 são evidência primária (★)**. Para comparação, o TCC tomado como bom modelo
usa 95 figuras no capítulo equivalente.

Algumas entradas são **pares ou trios de imagens dentro de uma única figura**
(A30, A38, A41, A42, A46, A47, B07, B11 e C10), como fazem os modelos ao tratar
estados sequenciais e comparações. Em número de arquivos `.png`, portanto, o
total fica em torno de **95**; em número de figuras numeradas no capítulo, em
torno de **84**.

---

## 6. Checklist de execução

### Antes
- [x] Vault de captura pronto: `docs/CAP4/vault-demo2` (ver [`VAULT-DEMO2.md`](VAULT-DEMO2.md))
- [ ] Vault aberto no app e conferido: imagem, tags e backlinks aparecendo
- [ ] Tema claro, janela maximizada, zoom 100%, DevTools fechado (3.2)
- [ ] Chave de API **ainda não configurada**
- [x] Pasta `docs/CAP4/capturas/` criada

### Rodadas
- [ ] **A** — 49 entradas, sem chave de API *(começa no onboarding, termina nos arquivos `.md` no Explorador)*
- [ ] **B** — 19 entradas, com chave configurada *(inclui A28, que depende de Configurações)*
- [ ] **C** — 10 entradas de exportação
- [ ] **D** — 7 entradas na máquina com o app instalado

### Depois
- [ ] Conferir a matriz da seção 5: nenhum RF sem figura
- [ ] Renomear tudo no padrão `<ID>-descricao.png`
- [ ] Atribuir os números de figura em sequência, a partir da **Figura 5**
- [ ] Montar a lista de ilustrações (os modelos têm uma, e ela é obrigatória)
- [ ] Escrever o parágrafo de abertura de cada figura no formato da seção 2

---

## 7. Erros que os modelos cometem e que você pode evitar

Lendo os três TCCs lado a lado, três problemas se repetem. Vale não herdá-los:

1. **Figura sem função.** O PhotoFind tem figuras que mostram apenas "a seção de
   destaque mantendo a barra de navegação padrão" — ou seja, nada. Aqui toda
   figura está amarrada a um RF; se uma captura não evidencia requisito nenhum,
   ela não entra.
2. **Legenda que descreve o óbvio.** "A Figura 20 demonstra o formulário
   preenchido com os dados mencionados na figura anterior." O parágrafo deve
   dizer **o que o sistema faz**, não o que a imagem mostra.
3. **Nenhuma evidência de falha.** Nos três modelos, todas as telas estão em
   estado de sucesso. As capturas **A44**, **A45** e **D07** mostram o sistema se
   comportando bem **quando algo falta ou dá errado** — e isso é mais forte como
   engenharia do que qualquer tela feliz.
