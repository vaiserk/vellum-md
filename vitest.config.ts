import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuração separada do vite.config.ts de propósito: o config de build carrega
// vite-plugin-electron, que dispara a compilação do processo principal a cada
// rodada de teste.
//
// O ambiente padrão é `node` (a maior parte dos testes cobre lógica pura, sem
// DOM). Os testes de componente declaram `// @vitest-environment jsdom` no topo
// do arquivo — é o caso do ErrorBoundary, que só pode ser verificado renderizando
// de verdade e provocando uma exceção.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'electron/**/*.test.ts'],
  },
});
