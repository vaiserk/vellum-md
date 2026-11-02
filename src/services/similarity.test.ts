import { describe, it, expect } from 'vitest';
import { cosineSimilarity, topKSimilar } from './similarity';

describe('cosineSimilarity', () => {
  it('retorna 1 para vetores idênticos', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('retorna 0 para vetores ortogonais', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('retorna -1 para vetores opostos', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);
  });

  it('é invariante à escala (só a direção importa)', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([1, 2, 3], [0.5, 1, 1.5])).toBeCloseTo(1, 10);
  });

  it('retorna 0 — e nunca NaN — quando um dos vetores é nulo', () => {
    const score = cosineSimilarity([0, 0, 0], [1, 2, 3]);
    expect(Number.isNaN(score)).toBe(false);
    expect(score).toBe(0);
  });

  it('retorna 0 para vetores vazios (denominador zero)', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('é simétrico: sim(a, b) === sim(b, a)', () => {
    const a = [0.2, -0.7, 0.5, 1];
    const b = [0.9, 0.1, -0.3, 0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 12);
  });

  // ── Dimensões incompatíveis ────────────────────────────────────────────────
  // Antes da guarda de dimensão, o primeiro caso retornava NaN e o segundo
  // devolvia 1 ignorando as dimensões extras — falhas silenciosas que faziam a
  // busca semântica não retornar nada, sem erro visível.
  it('retorna 0 quando o primeiro vetor é mais longo que o segundo', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('retorna 0 quando o segundo vetor é mais longo que o primeiro', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 99])).toBe(0);
  });

  it('nunca retorna NaN para dimensões incompatíveis', () => {
    expect(Number.isNaN(cosineSimilarity([1, 2, 3], [1, 2]))).toBe(false);
  });
});

describe('topKSimilar', () => {
  const index = new Map<string, number[]>([
    ['nota-identica.md', [1, 0, 0]],
    ['nota-ortogonal.md', [0, 1, 0]],
    ['nota-oposta.md', [-1, 0, 0]],
    ['nota-parecida.md', [0.9, 0.1, 0]],
  ]);
  const query = [1, 0, 0];

  it('ordena os resultados por score decrescente', () => {
    const results = topKSimilar(query, index, 4);
    const scores = results.map(r => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(results.map(r => r.path)).toEqual([
      'nota-identica.md',
      'nota-parecida.md',
      'nota-ortogonal.md',
      'nota-oposta.md',
    ]);
  });

  it('respeita o limite k', () => {
    const results = topKSimilar(query, index, 2);
    expect(results).toHaveLength(2);
    expect(results[0].path).toBe('nota-identica.md');
  });

  it('retorna tudo quando k é maior que o índice', () => {
    expect(topKSimilar(query, index, 99)).toHaveLength(index.size);
  });

  it('retorna lista vazia para índice vazio', () => {
    expect(topKSimilar(query, new Map(), 5)).toEqual([]);
  });

  it('os scores conferem com cosineSimilarity para cada caminho', () => {
    for (const { path, score } of topKSimilar(query, index, 10)) {
      expect(score).toBeCloseTo(cosineSimilarity(query, index.get(path)!), 12);
    }
  });
});
