import { useSettingsStore } from '../store/settings.store';
import { rateLimiter } from '../config/model-limits';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private static getHeaders(): Record<string, string> {
    const { apiKey, aiProvider } = useSettingsStore.getState();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (aiProvider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  static async chat(
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const { aiProvider, aiModel, apiKey } = useSettingsStore.getState();
    const provider = useSettingsStore.getState().getProvider();

    if (!apiKey) throw new Error('API key não configurada. Abra as Configurações e insira sua chave do Google AI Studio.');

    if (aiProvider === 'anthropic') {
      return this.chatAnthropic(messages, aiModel, onChunk);
    }

    // Gemma usa o endpoint nativo Google AI (generateContent), não o wrapper OpenAI-compatible
    // pois o wrapper /v1beta/openai só suporta modelos Gemini.
    if (aiProvider === 'gemma') {
      return this.chatGemma(messages, aiModel, apiKey, onChunk);
    }

    return this.chatOpenAICompatible(provider.baseUrl, aiModel, messages, onChunk);
  }

  private static async chatOpenAICompatible(
    baseUrl: string,
    model: string,
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error (${response.status}): ${err}`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {}
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  private static async chatAnthropic(
    messages: ChatMessage[],
    model: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemMsg?.content || '',
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic Error (${response.status}): ${err}`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text || '';
              fullText += text;
              onChunk(text);
            }
          } catch {}
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.content?.[0]?.text || '';
    }
  }

  // ── Gemma via Google AI native API ──────────────────────────────────────
  // Usa generateContent / streamGenerateContent em vez do wrapper OpenAI-compatible
  // que só suporta modelos Gemini. A chave é a mesma do AI Studio / Gemini.
  private static async chatGemma(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const convMessages = messages.filter(m => m.role !== 'system');

    // Gemma/Gemini usa "model" em vez de "assistant" para o papel do modelo
    const contents = convMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      // NÃO inclua thinkingConfig aqui — é exclusivo do Gemini 2.5+ e a API do Gemma
      // rejeita o parâmetro com erro 400, derrubando todo o chat.
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    };

    // systemInstruction é suportado nativamente por Gemma 3+ na Gemini API.
    // Acrescentamos uma diretiva anti-narração para evitar que modelos menores
    // "pensem em voz alta" / repitam as instruções antes de responder.
    if (systemMsg?.content) {
      const guard =
        '\n\nIMPORTANTE: Responda diretamente ao usuário em português. ' +
        'Não narre seu raciocínio, não repita estas instruções e não descreva o que vai fazer. ' +
        'Forneça apenas a resposta final.';
      body.systemInstruction = { parts: [{ text: systemMsg.content + guard }] };
    }

    // Respeita o rate limit do modelo (RPM) antes de chamar a API
    await rateLimiter.throttle(model);

    /** Extrai apenas o texto real das partes da resposta. */
    const extractText = (parts: any[]): string =>
      (parts ?? [])
        .filter((p: any) => p.thought !== true)
        .map((p: any) => p.text ?? '')
        .join('');

    if (onChunk) {
      // Streaming: streamGenerateContent com alt=sse
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemma API Error (${res.status}): ${err}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
            const text = extractText(parts);
            if (text) { fullText += text; onChunk(text); }
          } catch { /* linha incompleta — ignora */ }
        }
      }
      return fullText;
    } else {
      // Não-streaming: generateContent
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemma API Error (${res.status}): ${err}`);
      }
      const data = await res.json();
      return extractText(data?.candidates?.[0]?.content?.parts ?? []);
    }
  }

  // ── Lista modelos disponíveis na conta Google AI ──────────────────────────
  // Retorna {id, displayName} de todos os modelos que suportam generateContent.
  // Permite descobrir os IDs exatos dos modelos Gemma disponíveis na conta.
  // Lista modelos que suportam embedContent (modelos de embedding) —
  // filtrável por prefixo (ex: 'gemma', 'text-embedding', 'gemini-embedding')
  static async listGoogleEmbeddingModels(
    apiKey: string,
    filterPrefix = ''
  ): Promise<{ id: string; displayName: string }[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao listar modelos (${res.status}): ${err}`);
    }
    const data = await res.json();
    return ((data.models as any[]) ?? [])
      .filter(m => {
        const methods: string[] = m.supportedGenerationMethods ?? [];
        const id: string = (m.name as string).replace('models/', '');
        const supportsEmbed = methods.includes('embedContent');
        const matchesFilter = filterPrefix ? id.toLowerCase().includes(filterPrefix.toLowerCase()) : true;
        // Para Gemma: mostra todos os modelos Gemma mesmo que embedContent não esteja listado
        // (o usuário pode testar — a API retornará erro se não for suportado)
        const isGemmaFilter = filterPrefix.toLowerCase() === 'gemma';
        return isGemmaFilter ? matchesFilter : (supportsEmbed && matchesFilter);
      })
      .map(m => ({
        id: (m.name as string).replace('models/', ''),
        displayName: (m.displayName as string) || (m.name as string).replace('models/', ''),
      }));
  }

  static async listGoogleModels(apiKey: string): Promise<{ id: string; displayName: string }[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao listar modelos (${res.status}): ${err}`);
    }
    const data = await res.json();
    return ((data.models as any[]) ?? [])
      .filter(m =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map(m => ({
        id: (m.name as string).replace('models/', ''),
        displayName: (m.displayName as string) || (m.name as string).replace('models/', ''),
      }));
  }

  static async testConnection(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'system', content: 'Respond with OK.' },
        { role: 'user', content: 'Test' },
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
