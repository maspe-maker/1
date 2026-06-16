// ─────────────────────────────────────────────────────────────
// LicListo · Rate Limiting (token bucket + cuota diaria)
// Protege la llave de la API de IA contra ráfagas accidentales
// (doble clic, reintentos en bucle) y contra abuso sostenido.
//   - Ráfaga:  máx. N peticiones por ventana deslizante.
//   - Diario:  cuota persistida en localStorage (sobrevive F5).
// ─────────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

interface RateLimiterOptions {
  /** Peticiones permitidas por ventana de ráfaga. */
  burstLimit: number;
  /** Tamaño de la ventana de ráfaga, en ms. */
  burstWindowMs: number;
  /** Cuota máxima por día natural. */
  dailyLimit: number;
  /** Clave de persistencia en localStorage. */
  storageKey: string;
}

export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private readonly opts: RateLimiterOptions) {}

  private readDaily(): { date: string; count: number } {
    try {
      const raw = localStorage.getItem(this.opts.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; count: number };
        if (parsed.date === new Date().toDateString()) return parsed;
      }
    } catch {
      /* almacenamiento corrupto → reiniciar contador */
    }
    return { date: new Date().toDateString(), count: 0 };
  }

  private writeDaily(state: { date: string; count: number }) {
    try {
      localStorage.setItem(this.opts.storageKey, JSON.stringify(state));
    } catch {
      /* modo incógnito sin storage: el límite de ráfaga sigue activo */
    }
  }

  /** Cuántas peticiones quedan hoy. */
  remainingToday(): number {
    return Math.max(0, this.opts.dailyLimit - this.readDaily().count);
  }

  /**
   * Reserva un cupo. Lanza RateLimitError si se excede algún límite.
   * Llamar inmediatamente antes de la petición real.
   */
  acquire(): void {
    const now = Date.now();

    // 1) Ventana de ráfaga deslizante
    this.timestamps = this.timestamps.filter(
      (t) => now - t < this.opts.burstWindowMs,
    );
    if (this.timestamps.length >= this.opts.burstLimit) {
      const oldest = this.timestamps[0];
      const retryAfterMs = this.opts.burstWindowMs - (now - oldest);
      throw new RateLimitError(
        `Demasiados análisis seguidos. Espera ${Math.ceil(retryAfterMs / 1000)} s e inténtalo de nuevo.`,
        retryAfterMs,
      );
    }

    // 2) Cuota diaria
    const daily = this.readDaily();
    if (daily.count >= this.opts.dailyLimit) {
      throw new RateLimitError(
        `Alcanzaste el límite de ${this.opts.dailyLimit} análisis con IA por día. El contador se reinicia mañana.`,
        24 * 60 * 60 * 1000,
      );
    }

    this.timestamps.push(now);
    this.writeDaily({ date: daily.date, count: daily.count + 1 });
  }
}

/** Limitador global para el análisis de documentos con Gemini. */
export const geminiRateLimiter = new RateLimiter({
  burstLimit: 5,
  burstWindowMs: 60_000, // 5 análisis por minuto
  dailyLimit: 80,        // 80 análisis por día por navegador
  storageKey: 'liclisto.ratelimit.gemini',
});

/** Reintento con backoff exponencial para errores transitorios (429/5xx de la API). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof RateLimitError) throw err; // límite local: no reintentar
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /429|500|502|503|RESOURCE_EXHAUSTED|UNAVAILABLE|timeout/i.test(msg);
      if (!transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
