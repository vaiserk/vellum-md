// Tema do realce de código (highlight.js) acompanhando o tema do aplicativo.
//
// Antes, o Preview importava `github-dark.css` de forma estática. Como import
// de CSS é global, o tema ESCURO do código valia também no modo claro: texto
// cinza-claro sobre fundo branco, praticamente ilegível — tanto no preview
// quanto nas respostas do assistente de IA.
//
// Os dois temas entram como string (`?inline`) e só o correspondente ao tema
// atual fica aplicado, trocando junto com `data-theme`.

import temaClaro from 'highlight.js/styles/github.css?inline';
import temaEscuro from 'highlight.js/styles/github-dark.css?inline';

let elemento: HTMLStyleElement | null = null;
let observador: MutationObserver | null = null;

function aplicar() {
  const escuro = document.documentElement.getAttribute('data-theme') === 'dark';
  if (!elemento) {
    elemento = document.createElement('style');
    elemento.id = 'hljs-tema';
    document.head.appendChild(elemento);
  }
  const desejado = escuro ? temaEscuro : temaClaro;
  if (elemento.textContent !== desejado) elemento.textContent = desejado;
}

/** Idempotente: pode ser chamada por mais de um componente. */
export function sincronizarTemaDoCodigo() {
  aplicar();
  if (observador) return;
  observador = new MutationObserver(aplicar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
