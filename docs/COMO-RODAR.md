# Como rodar o VellumMD

Guia de execução do aplicativo em ambiente de desenvolvimento, em modo produção e para gerar o
instalador. Testado em **Windows 10** com **Node.js** e **PowerShell**.

---

## ⚠️ Antes de tudo: a variável `ELECTRON_RUN_AS_NODE`

**Este é o problema mais comum neste ambiente.** Se a variável `ELECTRON_RUN_AS_NODE` estiver
definida como `1`, o Electron **não abre janela nenhuma** — ele passa a executar o `main.js` como
se fosse um script Node comum. O resultado é o erro:

```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

Isso acontece porque, nesse modo, `require('electron').app` fica `undefined`.

### Como verificar

```powershell
echo "[$env:ELECTRON_RUN_AS_NODE]"
```

- Resposta `[]` → está tudo certo.
- Resposta `[1]` → precisa remover antes de rodar (passo abaixo).

### Como resolver

**Opção A — remover só na sessão atual** (recomendado, não mexe no sistema):

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

> ⚠️ **Importante:** o estado do shell **não persiste entre comandos** em algumas ferramentas.
> Por isso, coloque o `Remove-Item` **no mesmo comando** que inicia o app, separado por `;`.

**Opção B — remover permanentemente** da conta de usuário do Windows:

```powershell
[Environment]::SetEnvironmentVariable('ELECTRON_RUN_AS_NODE', $null, 'User')
```

Depois é preciso **fechar e reabrir o terminal** para a mudança valer.

---

## 1. Instalação das dependências (só na primeira vez)

```powershell
npm install
```

---

## 2. Modo desenvolvimento

Usa Vite com *hot reload* — as alterações no código aparecem na hora.

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npm run dev
```

**Características deste modo:**

| Item | Comportamento |
|---|---|
| DevTools | Abre automaticamente |
| `webSecurity` | Desabilitado |
| Hot reload | Ativo (Vite HMR) |
| Fonte da interface | Servidor Vite em memória |

> 💡 Se a janela abrir **branca** no modo dev, é um problema de HMR/CSS do modo de
> desenvolvimento — **não** é defeito do código. Use o modo produção (seção 3) para confirmar que
> o aplicativo está íntegro.

---

## 3. Modo produção (recomendado para usar o app) ✅

É o modo que **efetivamente funciona** neste ambiente. São dois passos:

### Passo 1 — gerar o build

```powershell
npx vite build
```

Isso gera três artefatos:

| Artefato | Conteúdo |
|---|---|
| `dist/index.html` + `dist/assets/` | Interface (React, CSS, fontes do KaTeX) |
| `dist-electron/main.js` | Processo principal do Electron |
| `dist-electron/preload.js` | Script de *preload* (ponte `contextBridge`) |

O build leva cerca de **1 minuto**. O aviso de *"Some chunks are larger than 500 kB"* é
esperado (é o Mermaid) e **não impede a execução**.

### Passo 2 — abrir o aplicativo

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npx electron .
```

A janela do VellumMD abre com o título **"VellumMD"**.

> Só é necessário refazer o **Passo 1** quando houver alteração no código-fonte (`src/` ou
> `electron/`). Para apenas reabrir o app, o Passo 2 basta.

### Abrir sem travar o terminal

O comando acima mantém o terminal ocupado enquanto o app roda. Para abrir de forma destacada:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Start-Process -FilePath ".\node_modules\electron\dist\electron.exe" -ArgumentList "." -WorkingDirectory $PWD
```

---

## 4. Gerar o instalador (distribuição)

```powershell
npm run build
```

Este script executa, em sequência: `tsc` → `vite build` → `electron-builder`.

O instalador é gerado na pasta **`release/`**. Configuração definida no `package.json`:

| Item | Valor |
|---|---|
| `appId` | `com.vaiserk.vellummd` |
| Windows | NSIS (`.exe`) |
| macOS | DMG |
| Linux | AppImage |

Depois de instalado, o app abre por **clique duplo**, sem terminal e sem risco da variável de
ambiente.

---

## 5. Verificar se o app realmente abriu

Launch sem erro no console **não** garante que a janela apareceu. Para confirmar:

```powershell
$p = Get-Process electron -ErrorAction SilentlyContinue
if ($p) {
  "Processos: $($p.Count)"
  ($p | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -Expand MainWindowTitle) -join ' | '
} else { "Nenhum processo electron" }
```

**Resultado esperado:**

```
Processos: 4
VellumMD
```

Um título de janela `VellumMD` confirma que o processo de renderização subiu corretamente.

---

## 6. Mensagens que podem ser ignoradas

Estes erros aparecem no console mas **não impedem o aplicativo de funcionar**:

```
ERROR:cache_util_win.cc(20)] Unable to move the cache: Acesso negado. (0x5)
ERROR:disk_cache.cc(208)] Unable to create cache
ERROR:gpu_disk_cache.cc(711)] Gpu Cache Creation failed: -2
```

**Causa:** o projeto está dentro de uma pasta sincronizada pelo **OneDrive**, que bloqueia a
escrita do cache de GPU do Chromium. O Electron simplesmente segue sem cache de GPU.

**Como eliminar (opcional):** mover o projeto para um caminho fora do OneDrive, por exemplo
`C:\dev\vellum-md`.

---

## 7. Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot read properties of undefined (reading 'whenReady')` | `ELECTRON_RUN_AS_NODE=1` | Remover a variável (topo deste guia) |
| Janela **branca** no `npm run dev` | Problema de HMR/CSS do modo dev | Usar o modo produção (seção 3) |
| Janela branca **no modo produção** | Build ausente ou desatualizado | Rodar `npx vite build` novamente |
| `electron.exe não encontrado` | Dependências não instaladas | Rodar `npm install` |
| App fecha logo após abrir | Comando encerrado junto com o terminal/job | Usar `Start-Process` (seção 3) |
| Erros de `cache` / `gpu_disk_cache` | Pasta no OneDrive | Ignorar, ou mover o projeto |

---

## Resumo rápido

```powershell
# 1. Instalar (primeira vez)
npm install

# 2. Buildar (sempre que mudar o código)
npx vite build

# 3. Abrir o aplicativo
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; npx electron .
```

---

*Documento gerado em 23 de outubro de 2026, a partir de execução real do aplicativo neste
ambiente (Windows 10, PowerShell).*
