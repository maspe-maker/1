// ─────────────────────────────────────────────────────────────
// LicListo · Monitoreo constante
//   1. Captura global de errores JS y promesas rechazadas.
//   2. trace(): mide latencia de operaciones críticas
//      (análisis IA, escrituras Firestore, subidas a Storage).
//   3. Web Vitals básicos (carga, primer render).
//   4. Buffer circular de eventos consultable desde Ajustes y
//      exportable para diagnóstico.
// En producción puedes conectar reportEvent() a Firebase
// Analytics / Performance o a tu colector preferido.
// ─────────────────────────────────────────────────────────────

export interface MonitorEvent {
  at: string;                       // ISO timestamp
  level: 'info' | 'warn' | 'error';
  name: string;                     // p. ej. 'gemini.analyze'
  durationMs?: number;
  detail?: string;
}

const MAX_EVENTS = 200;
const buffer: MonitorEvent[] = [];
const listeners = new Set<() => void>();

function push(event: MonitorEvent) {
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer.shift();
  listeners.forEach((fn) => fn());
}

export const monitor = {
  /** Registra un evento puntual. */
  log(name: string, level: MonitorEvent['level'] = 'info', detail?: string) {
    push({ at: new Date().toISOString(), level, name, detail });
  },

  /** Mide la duración de una operación asíncrona crítica. */
  async trace<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      push({
        at: new Date().toISOString(),
        level: 'info',
        name,
        durationMs: Math.round(performance.now() - start),
      });
      return result;
    } catch (err) {
      push({
        at: new Date().toISOString(),
        level: 'error',
        name,
        durationMs: Math.round(performance.now() - start),
        detail: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  /** Snapshot de los últimos eventos (más reciente al final). */
  events(): readonly MonitorEvent[] {
    return buffer;
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Exporta el buffer como JSON para soporte/diagnóstico. */
  exportJSON(): string {
    return JSON.stringify(buffer, null, 2);
  },
};

/** Inicializa los capturadores globales. Llamar una vez al arrancar. */
export function initMonitoring(): void {
  window.addEventListener('error', (e) => {
    monitor.log('window.error', 'error', `${e.message} @ ${e.filename}:${e.lineno}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    monitor.log('promise.unhandled', 'error', reason);
  });

  // Web Vitals básicos sin dependencias externas
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          monitor.log('webvitals.lcp', 'info', `${Math.round(entry.startTime)} ms`);
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* navegador sin soporte: omitir */
    }
  }

  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      monitor.log('webvitals.load', 'info', `${Math.round(nav.duration)} ms`);
    }
  });

  monitor.log('app.start', 'info', `v1.0.0 · ${navigator.userAgent.slice(0, 60)}`);
}
