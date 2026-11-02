import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EMBEDDING_DIMENSIONS,
  EmbeddingService,
  embeddingProviders,
} from './embedding.service';

// Nenhuma chamada de rede real: fetch é substituído por um mock que devolve
// respostas no formato de cada provedor. Os testes verificam o payload montado.
const fetchMock = vi.fn();

function googleReply(n = 1) {
  return {
    ok: true,
    status: 200,
    json: async () =>
      n === 1
        ? { embedding: { values: Array(EMBEDDING_DIMENSIONS).fill(0.1) } }
        : { embeddings: Array.from({ length: n }, () => ({ values: [0.1, 0.2] })) },
  };
}

function lastBody(call = 0): any {
  return JSON.parse(fetchMock.mock.calls[call][1].body);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EMBEDDING_DIMENSIONS', () => {
  it('é 768 — mudar este valor invalida o cache de embeddings do vault', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(768);
  });

  it('é um inteiro positivo', () => {
    expect(Number.isInteger(EMBEDDING_DIMENSIONS)).toBe(true);
    expect(EMBEDDING_DIMENSIONS).toBeGreaterThan(0);
  });
});

describe('embeddingProviders', () => {
  it('o modelo padrão de cada provedor está na lista de modelos disponíveis', () => {
    for (const [key, info] of Object.entries(embeddingProviders)) {
      expect(info.availableModels, `provedor ${key}`).toContain(info.defaultModel);
    }
  });
});

describe('EmbeddingService.embed — montagem do payload', () => {
  it('Google: envia texto limpo, taskType de consulta e outputDimensionality', async () => {
    fetchMock.mockResolvedValue(googleReply());

    await EmbeddingService.embed(
      '---\ntitle: X\n---\n\n# Título\n\nCorpo **da** nota.',
      'google',
      'gemini-embedding-001',
      'CHAVE',
      'query'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('gemini-embedding-001:embedContent');
    expect(url).toContain('key=CHAVE');
    expect(init.method).toBe('POST');

    const body = lastBody();
    expect(body.taskType).toBe('RETRIEVAL_QUERY');
    expect(body.outputDimensionality).toBe(EMBEDDING_DIMENSIONS);
    // frontmatter, marcação de título e negrito são removidos antes de embedar
    expect(body.content.parts[0].text).toBe('Título Corpo da nota.');
  });

  it('Google: usa RETRIEVAL_DOCUMENT no modo documento (padrão)', async () => {
    fetchMock.mockResolvedValue(googleReply());
    await EmbeddingService.embed('conteúdo da nota', 'google', 'text-embedding-004', 'K');
    expect(lastBody().taskType).toBe('RETRIEVAL_DOCUMENT');
  });

  it('OpenAI: envia dimensions e o header de autorização', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ index: 0, embedding: [0.1, 0.2] }] }),
    });

    await EmbeddingService.embed('texto da nota', 'openai', 'text-embedding-3-small', 'SK-123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/embeddings');
    expect(init.headers.Authorization).toBe('Bearer SK-123');
    const body = lastBody();
    expect(body.dimensions).toBe(EMBEDDING_DIMENSIONS);
    expect(body.model).toBe('text-embedding-3-small');
    expect(body.input).toBe('texto da nota');
  });

  it('rejeita sem tocar na rede quando o texto fica vazio após a limpeza', async () => {
    await expect(
      EmbeddingService.embed('```\ncodigo\n```', 'google', 'gemini-embedding-001', 'K')
    ).rejects.toThrow(/Texto vazio/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propaga erro HTTP com o status do provedor', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'modelo invalido',
      json: async () => ({}),
    });
    await expect(
      EmbeddingService.embed('nota qualquer', 'google', 'gemma-3-1b-it', 'K')
    ).rejects.toThrow(/400/);
  });
});

describe('EmbeddingService.embedBatch', () => {
  it('não faz requisição para lista vazia', async () => {
    await expect(EmbeddingService.embedBatch([], 'google', 'gemini-embedding-001', 'K')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('divide em lotes de 100 e preserva a ordem dos embeddings', async () => {
    const texts = Array.from({ length: 150 }, (_, i) => `passagem ${i}`);
    fetchMock
      .mockResolvedValueOnce(googleReply(100))
      .mockResolvedValueOnce(googleReply(50));

    const result = await EmbeddingService.embedBatch(texts, 'google', 'gemini-embedding-001', 'K');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastBody(0).requests).toHaveLength(100);
    expect(lastBody(1).requests).toHaveLength(50);
    expect(result).toHaveLength(150);
    // textos já limpos: embedBatch não reaplica cleanMarkdown
    expect(lastBody(0).requests[0].content.parts[0].text).toBe('passagem 0');
    expect(lastBody(1).requests[0].content.parts[0].text).toBe('passagem 100');
  });
});
