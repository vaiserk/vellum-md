export type EmbeddingProviderKey = 'google' | 'openai';

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

async function embedWithGoogle(text: string, model: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    }
  );
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

export class EmbeddingService {
  static async embed(
    text: string,
    provider: EmbeddingProviderKey,
    model: string,
    apiKey: string
  ): Promise<number[]> {
    const clean = cleanMarkdown(text);
    if (!clean) throw new Error('Texto vazio após limpeza de markdown.');

    switch (provider) {
      case 'google':
        return embedWithGoogle(clean, model, apiKey);
      case 'openai':
        return embedWithOpenAI(clean, model, apiKey);
      default:
        throw new Error(`Provedor de embedding desconhecido: ${provider}`);
    }
  }
}
