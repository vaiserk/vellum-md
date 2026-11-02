# Arquitetura Interativa — VellumMD

Dois artefatos gerados a partir da análise do codebase (42 nós, 67 conexões, 10 fluxos).

> **Atualizado em 02/11/2026** após a revisão final. Entraram os nós
> `ErrorBoundary`, `openNote` e `Testes (Vitest)`, e as descrições de `main`,
> `fs.handler` e `App` passaram a refletir o confinamento do IPC ao vault, a
> trava de navegação e a reabertura automática do vault. O `meta` do JSON ganhou
> os campos `lastReview`, `security` e `tests`. Ver
> [`../ACHADOS-REVISAO.md`](../ACHADOS-REVISAO.md).

## `index.html`
Página **autocontida** (dark, Tailwind via CDN — a única dependência externa).
Abra com dois cliques no navegador. Recursos:

- **Diagrama de arquitetura** em camadas (Interface → Estado → Serviços → IPC →
  Processo Principal → Persistência/Externos), com nós coloridos por grupo e
  conexões coloridas por tipo (IPC, API, estado, chamada, evento, I/O).
- **Fluxos interativos**: clique num fluxo para realçar o caminho (nós + arestas)
  e ver o passo a passo. Passe o mouse / clique em cada passo para focá-lo no
  diagrama.
- **Inspetor de nó**: clique em qualquer nó para ver arquivo, responsabilidade e
  as conexões de entrada/saída.

Os dados estão embutidos no próprio HTML (funciona offline, via `file://`).

## `architecture.json`
Mesmo modelo em formato legível por máquina, para **agentes de IA**:

```jsonc
{
  "meta":  { "project", "stack", "groups", ... },
  "nodes": [ { "id", "label", "file", "group", "layer", "desc" } ],
  "edges": [ { "source", "target", "kind", "label" } ],
  "flows": [ { "id", "name", "desc",
               "steps": [ { "title", "detail", "node", "edge": ["from","to"] } ] } ]
}
```

`kind` das arestas: `ipc` · `api` · `call` · `subscribe` · `event` · `data` ·
`contains` · `loads`. Toda aresta referenciada nos `flows` existe em `edges`
(integridade verificada).

> Snapshot da arquitetura pós-atualização de Julho/2026 (ver
> `../ATUALIZACAO-JULHO-2026.md`). Ao mudar a estrutura, regenere ambos.
