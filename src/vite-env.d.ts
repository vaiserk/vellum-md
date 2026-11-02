/// <reference types="vite/client" />

// CSS importado como string com o sufixo `?inline` do Vite.
// Usado em src/utils/hljs-theme.ts para alternar o tema do realce de código
// entre claro e escuro sem recarregar a página.
declare module '*.css?inline' {
  const conteudo: string;
  export default conteudo;
}
