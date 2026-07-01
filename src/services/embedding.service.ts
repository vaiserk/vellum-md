import { rateLimiter } from '../config/model-limits';

// Nota: modelos Gemma (gemma-*-it) são generativos e NÃO suportam embedContent —
// a API retorna 400. Por isso Gemma não é oferecido como provedor de embedding;
// para chat/geração de texto, Gemma continua disponível em ai.service.ts.
export type EmbeddingProviderKey = 'google' | 'openai';

export interface EmbeddingProviderInfo {
  name: string;
  defaultModel: string;
  availableModels: string[];
}

export const embeddingProviders: Record<EmbeddingProviderKey, EmbeddingProviderInfo> = {
  google: {
    name: 'Google (Gemini)',
    // gemini-embedding-001 é o modelo de embedding GA da Gemini API;
    // text-embedding-004 é o modelo legado (768 dims), mantido como alternativa.
    defaultModel: 'gemini-embedding-001',
    availableModels: ['gemini-embedding-001', 'text-embedding-004'],
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'text-embedding-3-small',
    availableModels: ['text-embedding-3-small', 'text-embedding-3-large'],
  },
};

const MAX_TEXT_CHARS = 6000;

export function cleanMarkdown(content: string): string {
  let text = content;
  // Remove frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, '');
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]*`/g, '');
  // Remove LaTeX blocks
  text = text.replace(/\$\$[\s\S]*?\$\$/g, '');
  text = text.replace(/\$[^$\n]+\$/g, '');
  // Remove images and links but keep text
  text = text.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '');
  text = text.replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1');
  // Remove wikilinks but keep name
  text = text.replace(/\[\[([^\]|]*)\|?[^\]]*\]\]/g, '$1');
  // Remove markdown headers syntax
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove bold/italic
  text = text.replace(/[*_]{1,3}([^*_\n]*)[*_]{1,3}/g, '$1');
  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');
  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

// Split note content into semantically coherent passages for chunk-level indexing.
// Splits on paragraph breaks first, then merges short chunks and caps each at maxLen chars.
export function splitIntoPassages(content: string, maxLen = 350): string[] {
  const body = content.replace(/^---[\s\S]*?---\n?/, '');
  const rawParagraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

  const clean = (para: string): string =>
    para
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\$\$[\s\S]*?\$\$/g, '')
      .replace(/\$[^$\n]+\$/g, '')
      .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
      .replace(/\[\[([^\]|]*)\|?[^\]]*\]\]/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_]{1,3}([^*_\n]*)[*_]{1,3}/g, '$1')
      .replace(/^>\s*/gm, '')
      .replace(/^[-*_]{3,}\s*$/gm, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const passages: string[] = [];
  let buffer = '';

  for (const para of rawParagraphs) {
    if (para.startsWith('```')) continue;
    const cleaned = clean(para);
    if (!cleaned || cleaned.length < 20) continue;

    if (buffer.length + cleaned.length + 1 > maxLen && buffer) {
      passages.push(buffer);
      buffer = cleaned;
    } else {
      buffer = buffer ? `${buffer} ${cleaned}` : cleaned;
    }
  }
  if (buffer.length >= 20) passages.push(buffer);

  // Fallback: chunk the full cleaned text if no paragraphs were found
  if (passages.length === 0) {
    const full = cleanMarkdown(content);
    for (let i = 0; i < full.length; i += maxLen) {
      const chunk = full.slice(i, i + maxLen).trim();
      if (chunk.length >= 20) passages.push(chunk);
    }
  }

  return passages;
}

export function extractTags(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];
  const fm = frontmatterMatch[1];

  // Inline array: tags: [a, b, c]
  const inlineMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  // Block array:
  // tags:
  //   - a
  //   - b
  const blockMatch = fm.match(/^tags:\s*\n((?:[ \t]*-[ \t]+[^\n]+\n?)*)/m);
  if (blockMatch) {
    const lines = blockMatch[1].match(/[ \t]*-[ \t]+([^\n]+)/g) || [];
    return lines
      .map(l => l.replace(/^[ \t]*-[ \t]+/, '').trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  return [];
}

/** Extrai o delay de retry em ms de uma resposta 429 da Google API. */
function parseRetryDelayMs(body: any): number {
  try {
    const details: any[] = body?.error?.details ?? [];
    const retryInfo = details.find(d => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      // Formato: "25s" ou "25.937s"
      const secs = parseFloat(String(retryInfo.retryDelay).replace('s', ''));
      if (!isNaN(secs)) return Math.ceil(secs * 1000) + 500; // +500ms de margem
    }
  } catch { /* ignora */ }
  return 30_000; // fallback: aguarda 30s
}

async function embedWithGoogle(
  text: string, model: string, apiKey: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT', attempt = 0
): Promise<number[]> {
  // Rate limiter: respeita RPM antes de disparar a requisição
  await rateLimiter.throttle(model);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, taskType }),
    }
  );

  // 429: rate limit da Google — aguarda o tempo sugerido e retenta (até 3x)
  if (res.status === 429 && attempt < 3) {
    const body = await res.json().catch(() => ({}));
    const wait = parseRetryDelayMs(body);
    console.warn(`[Embedding] 429 — aguardando ${Math.ceil(wait / 1000)}s antes de retentar (${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, wait));
    return embedWithGoogle(text, model, apiKey, taskType, attempt + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Embedding Error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.embedding.values as number[];
}

async function embedWithOpenAI(text: string, model: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Embedding Error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// ── Batch embedding ──────────────────────────────────────────────────────────
// Embeda vários textos em UMA requisição HTTP. É a estratégia central de
// indexação: um arquivo (documento + N passagens) custa 1 requisição em vez de
// N+1, o que reduz drasticamente o consumo de RPM do free tier (100 RPM) e o
// tempo total de indexação do vault.

/** Máximo de textos por requisição batchEmbedContents (limite da API Google). */
const GOOGLE_BATCH_LIMIT = 100;

async function embedBatchWithGoogle(
  texts: string[], model: string, apiKey: string,
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT', attempt = 0
): Promise<number[][]> {
  await rateLimiter.throttle(model);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
        })),
      }),
    }
  );

  if (res.status === 429 && attempt < 3) {
    const body = await res.json().catch(() => ({}));
    const wait = parseRetryDelayMs(body);
    console.warn(`[Embedding] 429 (batch) — aguardando ${Math.ceil(wait / 1000)}s (${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, wait));
    return embedBatchWithGoogle(texts, model, apiKey, taskType, attempt + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Embedding Error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return (data.embeddings as { values: number[] }[]).map(e => e.values);
}

async function embedBatchWithOpenAI(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    // A API da OpenAI aceita array de textos nativamente
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI Embedding Error (${res.status}): ${err}`);
  }
  const data = await res.json();
  // A resposta preserva a ordem via campo index
  return (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

export type EmbeddingMode = 'query' | 'document';

export class EmbeddingService {
  static async embed(
    text: string,
    provider: EmbeddingProviderKey,
    model: string,
    apiKey: string,
    mode: EmbeddingMode = 'document'
  ): Promise<number[]> {
    const clean = cleanMarkdown(text);
    if (!clean) throw new Error('Texto vazio após limpeza de markdown.');

    const taskType = mode === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';

    switch (provider) {
      case 'google':
        return embedWithGoogle(clean, model, apiKey, taskType);
      case 'openai':
        return embedWithOpenAI(clean, model, apiKey);
      default:
        throw new Error(`Provedor de embedding desconhecido: ${provider}`);
    }
  }

  /**
   * Embeda vários textos JÁ LIMPOS (sem markdown) preservando a ordem.
   * Divide em lotes conforme o limite da API. Usado pela indexação do vault:
   * [documento, ...passagens] de um arquivo em uma única chamada.
   */
  static async embedBatch(
    texts: string[],
    provider: EmbeddingProviderKey,
    model: string,
    apiKey: string,
    mode: EmbeddingMode = 'document'
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    const taskType = mode === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += GOOGLE_BATCH_LIMIT) {
      const chunk = texts.slice(i, i + GOOGLE_BATCH_LIMIT);
      const embeddings = provider === 'openai'
        ? await embedBatchWithOpenAI(chunk, model, apiKey)
        : await embedBatchWithGoogle(chunk, model, apiKey, taskType);
      results.push(...embeddings);
    }
    return results;
  }
}
