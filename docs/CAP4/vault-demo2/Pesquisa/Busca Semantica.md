---
title: "Busca Semantica"
created: 2026-10-15T15:25:00.000Z
modified: 2026-10-30T19:40:00.000Z
tags: [tcc, referencia]
aliases: []
---

# Busca Semântica

A consulta e cada trecho das notas são convertidos em vetores. A proximidade
entre vetores aproxima sentidos, não grafias.

$$ \cos\theta = \frac{a \cdot b}{\|a\| \, \|b\|} $$

| Etapa | Onde acontece |
|---|---|
| Fragmentação em trechos | local |
| Geração do vetor | API do provedor |
| Comparação | local |
| Cache do índice | `.vellum/embeddings.json` |

Apenas o texto enviado à API sai da máquina; o índice permanece no vault.

Ver [[Arquitetura]] e [[Carga Cognitiva]].
