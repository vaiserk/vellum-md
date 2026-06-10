import { rateLimiter } from '../config/model-limits';

export type EmbeddingProviderKey = 'google' | 'openai' | 'gemma';

export interface EmbeddingProviderInfo {
  name: string;
  defaultModel: string;
  availableModels: string[];
}

export const embeddingProviders: Record<EmbeddingProviderKey, EmbeddingProviderInfo> = {
  google: {
    name: 'Google (Gemini)',
    defaultModel: 'gemini-embedding-2-preview',
    availableModels: ['gemini-embedding-2-preview', 'text-embedding-004'],
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'text-embedding-3-small',
    availableModels: ['text-embedding-3-small', 'text-embedding-3-large'],
  },
  // Gemma via Google AI API — usa o mesmo endpoint embedContent do Google.
  // Modelos Gemma instruction-tuned geram representações vetoriais via API.
  // Use a mesma chave de API do AI Studio / Gemini.
  gemma: {
    name: 'Gemma (Google)',
    defaultModel: 'gemma-4-e4b-it',
    availableModels: [
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',
      'gemma-4-e4b-it',
      'gemma-4-e2b-it',
      'gemma-3-27b-it',
      'gemma-3-12b-it',
      'gemma-3-4b-it',
      'gemma-3-1b-it',
    ],
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

// Gemma via Google AI API — usa o endpoint embedContent com modelos Gemma.
// A mesma chave de API do AI Studio / Gemini é utilizada.
async function embedWithGemma(
  text: string, model: string, apiKey: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT', attempt = 0
): Promise<number[]> {
  await rateLimiter.throttle(model);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType,
      }),
    }
  );

  if (res.status === 429 && attempt < 3) {
    const body = await res.json().catch(() => ({}));
    const wait = parseRetryDelayMs(body);
    console.warn(`[Embedding/Gemma] 429 — aguardando ${Math.ceil(wait / 1000)}s (${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, wait));
    return embedWithGemma(text, model, apiKey, taskType, attempt + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemma Embedding Error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.embedding.values as number[];
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
      case 'gemma':
        return embedWithGemma(clean, model, apiKey, taskType);
      default:
        throw new Error(`Provedor de embedding desconhecido: ${provider}`);
    }
  }
}
