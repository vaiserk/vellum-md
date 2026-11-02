import { describe, it, expect, vi } from 'vitest';

// O módulo importa 'electron' no topo (ipcMain, BrowserWindow, dialog). Nos
// testes só interessa a lógica pura, então o módulo nativo é substituído por um
// duplo — nenhum handler IPC é registrado, nada toca no disco.
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: class {},
  dialog: { showSaveDialog: vi.fn() },
}));

const { escapeHtml } = await import('./export.handler');

describe('escapeHtml', () => {
  it('escapa & antes dos demais, sem escapar duas vezes', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    // se & fosse escapado depois de <, sairia '&lt;' virando '&amp;lt;' errado
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('escapa < e >', () => {
    expect(escapeHtml('<b>')).toBe('&lt;b&gt;');
    expect(escapeHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
  });

  it('escapa aspas duplas (títulos usados em atributos HTML)', () => {
    expect(escapeHtml('diz "olá"')).toBe('diz &quot;olá&quot;');
  });

  it('neutraliza uma tentativa de injeção de script em título de nota', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('não altera texto sem caracteres especiais nem a aspa simples', () => {
    expect(escapeHtml('Notas de Pesquisa — 2026')).toBe('Notas de Pesquisa — 2026');
    // documenta o contrato atual: ' não é escapado; os atributos gerados pelo
    // exportador usam aspas duplas, então o valor continua seguro lá.
    expect(escapeHtml("d'água")).toBe("d'água");
  });
});
