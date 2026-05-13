import { useSettingsStore } from '../store/settings.store';

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

    if (!apiKey) throw new Error('API key não configurada. Abra as Configurações.');

    if (aiProvider === 'anthropic') {
      return this.chatAnthropic(messages, aiModel, onChunk);
    } else {
      return this.chatOpenAICompatible(provider.baseUrl, aiModel, messages, onChunk);
    }
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
