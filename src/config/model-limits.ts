/**
 * Limites de taxa por modelo (Google AI Studio — free tier).
 * Fonte: AI Studio → selecione o modelo → coluna de limites.
 * Atualize os valores conforme sua conta/plano.
 */

export interface ModelRateLimit {
  /** Requisições por minuto */
  rpm: number;
  /** Tokens por minuto (null = desconhecido / sem limite registrado) */
  tpm: number | null;
  /** Requisições por dia (null = ilimitado) */
  rpd: number | null;
}

export const MODEL_RATE_LIMITS: Record<string, ModelRateLimit> = {
  // ── Gemma 4 (free tier — confirmado via AI Studio) ──────────────────────
  'gemma-4-31b-it':     { rpm: 15, tpm: 1_500,   rpd: null },
  'gemma-4-26b-a4b-it': { rpm: 15, tpm: 1_500,   rpd: null },
  'gemma-4-e4b-it':     { rpm: 15, tpm: 1_500,   rpd: null },
  'gemma-4-e2b-it':     { rpm: 15, tpm: 1_500,   rpd: null },

  // ── Gemma 3 ─────────────────────────────────────────────────────────────
  'gemma-3-27b-it':     { rpm: 15, tpm: 1_500,   rpd: null },
  'gemma-3-12b-it':     { rpm: 30, tpm: 15_000,  rpd: null },
  'gemma-3-4b-it':      { rpm: 30, tpm: 15_000,  rpd: null },
  'gemma-3-1b-it':      { rpm: 30, tpm: 15_000,  rpd: null },
  'gemma-3n-e4b-it':    { rpm: 30, tpm: 15_000,  rpd: null },
  'gemma-3n-e2b-it':    { rpm: 30, tpm: 15_000,  rpd: null },

  // ── Gemini (referência) ──────────────────────────────────────────────────
  'gemini-2.5-flash':      { rpm: 10,  tpm: 250_000,   rpd: 500  },
  'gemini-2.5-flash-lite': { rpm: 15,  tpm: 250_000,   rpd: 1500 },
  'gemini-2.0-flash':      { rpm: 15,  tpm: 1_000_000, rpd: 1500 },

  // ── Embedding (Google) — valores do AI Studio free tier ─────────────────
  'gemini-embedding-001': { rpm: 100, tpm: 30_000, rpd: 1_000 },
  'text-embedding-004':   { rpm: 100, tpm: 30_000, rpd: 1_000 },
};

/** Limite conservador para modelos não cadastrados */
export const DEFAULT_RATE_LIMIT: ModelRateLimit = { rpm: 10, tpm: null, rpd: null };

// ── Sliding-window rate limiter (em memória, por modelo) ─────────────────────

class ModelRateLimiter {
  /** model → array de timestamps (ms) das últimas requisições */
  private windows = new Map<string, number[]>();

  private getWindow(model: string): number[] {
    if (!this.windows.has(model)) this.windows.set(model, []);
    return this.windows.get(model)!;
  }

  private clean(model: string): number[] {
    const cutoff = Date.now() - 60_000;
    const fresh = this.getWindow(model).filter(t => t > cutoff);
    this.windows.set(model, fresh);
    return fresh;
  }

  /** true se é seguro fazer uma requisição agora */
  canRequest(model: string): boolean {
    const { rpm } = MODEL_RATE_LIMITS[model] ?? DEFAULT_RATE_LIMIT;
    return this.clean(model).length < rpm;
  }

  /** ms até ser seguro fazer a próxima requisição (0 = já pode) */
  waitMs(model: string): number {
    const { rpm } = MODEL_RATE_LIMITS[model] ?? DEFAULT_RATE_LIMIT;
    const window = this.clean(model);
    if (window.length < rpm) return 0;
    return Math.max(0, window[0] + 60_000 - Date.now());
  }

  /** Registra requisição realizada */
  record(model: string): void {
    this.clean(model).push(Date.now());
    // clean() retorna uma ref à janela atualizada, mas precisamos re-salvar
    const updated = this.windows.get(model)!;
    updated.push(Date.now());
    this.windows.set(model, updated);
  }

  /**
   * Aguarda automaticamente se o rate limit for atingido, depois registra.
   * Usar antes de cada chamada à API Gemma.
   */
  async throttle(model: string): Promise<void> {
    const wait = this.waitMs(model);
    if (wait > 0) {
      console.info(`[RateLimit] ${model}: aguardando ${Math.ceil(wait / 1000)}s (RPM ${(MODEL_RATE_LIMITS[model] ?? DEFAULT_RATE_LIMIT).rpm})`);
      await new Promise(r => setTimeout(r, wait + 300)); // +300ms de margem
    }
    // Registrar após aguardar
    const window = this.clean(model);
    window.push(Date.now());
    this.windows.set(model, window);
  }

  /** Status atual para exibição */
  getStatus(model: string): { used: number; rpm: number; tpm: number | null; rpd: number | null; resetInMs: number } {
    const limits = MODEL_RATE_LIMITS[model] ?? DEFAULT_RATE_LIMIT;
    const window = this.clean(model);
    const oldest = window[0] ?? Date.now();
    return {
      used: window.length,
      rpm: limits.rpm,
      tpm: limits.tpm,
      rpd: limits.rpd,
      resetInMs: Math.max(0, oldest + 60_000 - Date.now()),
    };
  }
}

/** Instância singleton — compartilhada entre AI e Embedding services */
export const rateLimiter = new ModelRateLimiter();
