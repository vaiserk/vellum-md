---
title: "Apresentacao"
created: 2026-10-20T13:00:00.000Z
modified: 2026-11-02T11:00:00.000Z
tags: [aula, tcc]
aliases: []
---

# VellumMD

Notas locais, busca por significado

---

## O problema

- O volume de notas cresce
- A busca por palavra exata falha
- A nota existe, mas não é reencontrada

---

## A proposta

$$ sim(a,b) = \frac{a \cdot b}{\|a\| \, \|b\|} $$

Recuperação por proximidade de sentido.

---

## Arquitetura

```mermaid
graph LR
  A["Nota .md"] --> B["Embedding"] --> C["Índice local"]
```

---

## Resultado

| Antes | Depois |
|---|---|
| Palavra exata | Significado |
| Nuvem | Disco local |
