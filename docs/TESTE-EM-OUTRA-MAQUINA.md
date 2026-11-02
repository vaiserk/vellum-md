# Teste do VellumMD em outra máquina

Roteiro para instalar e validar o aplicativo numa máquina diferente da de
desenvolvimento. É o último item em aberto da revisão: até aqui o app foi
testado **empacotado** (`win-unpacked`), mas nunca **instalado de fato**, e
nunca num Windows que não tem Node, Electron nem as dependências do projeto.

---

## O que levar

Apenas **um arquivo**:

```
release\VellumMD Setup 1.0.1.exe
```

Cabe num pen drive (≈ 104 MB). Não precisa levar o código, nem instalar nada
além dele.

> 💡 Se quiser ter o vault de demonstração junto, leve também a pasta
> `docs/banner/vault-demo`. Caso contrário, crie notas na hora — o teste 6
> cobre isso.

---

## Antes de começar

**O instalador não é assinado digitalmente.** O Windows vai mostrar a tela azul
*"O Windows protegeu o computador"*. Isso é esperado: certificado de assinatura
de código é pago, e o projeto não tem um.

Para prosseguir: **Mais informações → Executar assim mesmo**.

> Vale saber disso para a banca: se perguntarem sobre distribuição, a resposta
> é que o instalador funciona, mas exigiria um certificado (~R$ 500–1.500/ano)
> para não disparar o aviso — está listado como custo no Business Model Canvas.

---

## Instalação

- [ ] Rodar `VellumMD Setup 1.0.1.exe`
- [ ] Passar pelo aviso do SmartScreen
- [ ] Escolher o diretório de instalação (o instalador permite trocar)
- [ ] Conferir que o **atalho na área de trabalho** foi criado
- [ ] Conferir o **ícone**: quadrado roxo com um pergaminho — se aparecer o
      ícone genérico do Electron, algo deu errado no empacotamento
- [ ] Abrir o app pelo atalho

---

## Os testes

Marque o que funcionar e anote o que não funcionar.

### 0. O manual embutido
- [ ] Pressionar **F1** → abre o *Manual do VellumMD* numa janela própria
- [ ] Conferir o menu **Ajuda**: tem atalhos diretos para Atalhos de teclado,
      Comandos de barra e Solução de problemas, e um **Sobre** com a versão
- [ ] O manual tem que abrir mesmo **sem internet** (ele é autocontido)
- [ ] Na seção *Atalhos de teclado*, testar o campo de filtro

> Se alguém na empresa quiser entender o app, o manual responde sozinho — é
> o lugar para onde apontar em vez de explicar na mão.

### 1. Primeira execução
- [ ] Aparece o **assistente de configuração** (4 passos)
- [ ] O tema segue o do Windows da máquina (claro ou escuro)
- [ ] O botão de tema no canto do card funciona
- [ ] Escolher/criar um vault no passo 2
- [ ] Pular a configuração de IA no passo 3 (teste sem chave primeiro)
- [ ] O app abre na tela principal

### 2. Sem chave de API — o app não pode quebrar
- [ ] Abrir a aba **Busca** 🔍 → deve explicar que falta configurar a chave,
      não dar erro nem tela branca
- [ ] Abrir o **assistente de IA** (`Ctrl+Shift+A`) → mensagem clara sobre a
      chave faltando
- [ ] O resto do app (escrever, salvar, exportar) deve funcionar normalmente

> Este é um teste importante: o VellumMD é **local-first**, então tudo que não
> é IA precisa funcionar sem nenhuma configuração.

### 3. Escrita e renderização
- [ ] Criar uma nota (`Ctrl+N`)
- [ ] Escrever texto com **negrito**, *itálico*, título e lista
- [ ] `Ctrl+\` três vezes → passa por dividido, preview e editor
- [ ] Inserir uma **fórmula** pelo botão da barra → renderiza
- [ ] Inserir um **diagrama** pelo botão → renderiza
- [ ] Inserir uma **tabela** pelo botão → renderiza no editor e no preview,
      com a mesma largura nos dois painéis
- [ ] Marcar um checkbox no preview → grava na nota
- [ ] Digitar e ver o rodapé ir para "Salvando" e depois "Salvo"

### 4. O caso que derrubava o app
- [ ] Escrever um link assim: `[google](www.google.com)`
- [ ] Clicar nele no preview → deve **abrir o navegador**, e o app continuar
      funcionando

> Antes da correção de hoje isso deixava a janela em branco, sem recuperação.

### 5. Arquivos
- [ ] Criar nota dentro de uma **subpasta** (seletor no modal)
- [ ] **Mover** uma nota entre pastas (botão direito → Mover para…)
- [ ] **Renomear** uma nota
- [ ] **Excluir** uma nota → banner com Desfazer
- [ ] Esperar o banner sumir e abrir a **Lixeira** (ícone 🗑) → restaurar de lá
- [ ] Colapsar e expandir pastas na árvore

### 6. Exportação
- [ ] `Ctrl+Shift+E` → **PDF**: o nome sugerido deve ser o **da nota**
- [ ] **Slides**: fatiar e exportar (o botão mostra "Convertendo...")
- [ ] **Site**: exportar, abrir o `index.html` → deve cair na **capa**, e o
      botão **Voltar** do navegador deve funcionar
- [ ] Abrir o PDF e o site gerados: fórmulas e diagramas devem aparecer

### 7. Persistência
- [ ] Fechar o app com uma alteração recém-digitada (sem esperar salvar)
- [ ] Reabrir → **a alteração deve estar lá** e o **vault deve reabrir sozinho**
- [ ] O tema escolhido deve ter sido mantido

### 8. Com chave de API (se quiser testar a IA)
- [ ] `Ctrl+,` → configurar provedor e chave
- [ ] Aguardar a indexação
- [ ] Buscar por significado: `como reduzir o esforço de lembrar das coisas`
- [ ] Selecionar um parágrafo e clicar **Expandir** → deve usar a seleção
- [ ] Testar **Resumir**, **Tabela** e **Diagrama**

---

## Como me reportar

Para cada falha, anote:

```
O que eu fiz:
O que aconteceu:
O que eu esperava:
```

Se der tela branca ou erro visível, **tire print**.

### Pegando o log na outra máquina

O app instalado não grava log por padrão. Para capturar, abra o **PowerShell**
na pasta de instalação e rode:

```powershell
.\VellumMD.exe --enable-logging 2> log.txt
```

O arquivo `log.txt` fica ali do lado. Me mande junto com o relato — ele mostra
erro que não aparece na tela.

> A pasta de instalação costuma ser
> `C:\Users\<seu-usuario>\AppData\Local\Programs\VellumMD`.

---

## Desinstalar depois

Configurações do Windows → Aplicativos → VellumMD → Desinstalar.

As **notas não são apagadas**: elas ficam na pasta do vault que você escolheu,
em Markdown puro. É justamente o argumento de soberania de dados do trabalho —
desinstalar o programa não tira seus arquivos de você.
