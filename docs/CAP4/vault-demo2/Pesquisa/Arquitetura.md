---
title: "Arquitetura"
created: 2026-10-16T10:40:00.000Z
modified: 2026-10-31T12:05:00.000Z
tags: [tcc, referencia]
aliases: []
---

# Arquitetura

Três processos isolados: a interface não toca o disco diretamente.

```mermaid
graph LR
  R["Renderer (React)"] --> P["Preload (ponte)"]
  P --> M["Main (Node)"]
  M --> F["Sistema de arquivos"]
  M --> A["APIs de IA"]
```

| Processo | Responsabilidade |
|---|---|
| Renderer | Interface e edição |
| Preload | Canais autorizados |
| Main | Disco, janelas, exportação |

> [!WARNING]
> Sem a ponte, uma página remota herdaria acesso ao disco.

Ver [[Busca Semantica]].
