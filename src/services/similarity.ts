export function cosineSimilarity(a: number[], b: number[]): number {
  // Vetores de dimensões diferentes não são comparáveis. Sem esta guarda, o
  // laço (que vai até a.length) produzia NaN quando `a` era maior que `b`, e
  // ignorava em silêncio as dimensões extras quando era menor — nos dois casos
  // a busca semântica falhava sem erro visível. Retorna 0 (nenhuma
  // similaridade) em vez de lançar, para que um único embedding corrompido no
  // cache não derrube a busca inteira.
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function topKSimilar(
  query: number[],
  index: Map<string, number[]>,
  k: number
): Array<{ path: string; score: number }> {
  const results: Array<{ path: string; score: number }> = [];
  index.forEach((embedding, path) => {
    results.push({ path, score: cosineSimilarity(query, embedding) });
  });
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}
