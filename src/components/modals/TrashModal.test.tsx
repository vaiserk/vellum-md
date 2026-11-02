// @vitest-environment jsdom
// jsdom: TrashModal importa a store do vault, que lê localStorage/matchMedia
// na inicialização do tema.
import { describe, it, expect } from 'vitest';
import { formatarQuando } from './TrashModal';

// Base fixa para os testes não dependerem da hora em que rodam
const AGORA = new Date(2026, 10, 2, 14, 30, 0).getTime();
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe('formatarQuando', () => {
  it('menos de um minuto', () => {
    expect(formatarQuando(AGORA - 5_000, AGORA)).toBe('há poucos segundos');
  });

  it('minutos no singular e no plural', () => {
    expect(formatarQuando(AGORA - MINUTO, AGORA)).toBe('há 1 minuto');
    expect(formatarQuando(AGORA - 5 * MINUTO, AGORA)).toBe('há 5 minutos');
  });

  it('horas, dentro do mesmo dia', () => {
    expect(formatarQuando(AGORA - HORA, AGORA)).toBe('há 1 hora');
    expect(formatarQuando(AGORA - 3 * HORA, AGORA)).toBe('há 3 horas');
  });

  it('ontem mostra a hora', () => {
    expect(formatarQuando(AGORA - DIA, AGORA)).toMatch(/^ontem às \d{2}:\d{2}$/);
  });

  it('dias, até uma semana', () => {
    expect(formatarQuando(AGORA - 3 * DIA, AGORA)).toBe('há 3 dias');
  });

  it('mais de uma semana cai para a data', () => {
    expect(formatarQuando(AGORA - 30 * DIA, AGORA)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('data no futuro (relógio adiantado) não vira número negativo', () => {
    expect(formatarQuando(AGORA + 10 * MINUTO, AGORA)).toBe('há poucos segundos');
  });
});
