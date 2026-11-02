import { defineConfig } from 'vitest/config';

// Configuração separada do vite.config.ts de propósito: o config de build carrega
// vite-plugin-electron, que dispara a compilação do processo principal. Os testes
// cobrem apenas lógica pura (sem DOM, sem I/O), então rodam em ambiente node puro.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
  },
});
