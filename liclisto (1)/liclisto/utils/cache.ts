// ─────────────────────────────────────────────────────────────
// LicListo · Caché de análisis de IA
// Si el mismo conjunto de archivos ya fue analizado, el resultado
// se sirve desde caché local: respuesta instantánea, cero costo
// de API y cero consumo de la cuota de rate limiting.
//   - Clave: SHA-256 del contenido binario de los archivos.
//   - TTL: 30 días.  - Poda: LRU al exceder 60 entradas.
// (La caché de DATOS de Firestore es aparte: persistencia offline
//  configurada en firebase.ts.)
// ─────────────────────────────────────────────────────────────

const PREFIX = 'liclisto.cache.analysis.';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 60;

interface CacheEnvelope<T> {
  savedAt: number;
  lastUsed: number;
  value: T;
}

/** SHA-256 (hex) del contenido combinado de varios archivos. */
export async function hashFiles(files: File[]): Promise<string> {
  const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
  const total = buffers.reduce((n, b) => n + b.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    merged.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', merged);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - env.savedAt > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    env.lastUsed = Date.now();
    localStorage.setItem(PREFIX + key, JSON.stringify(env));
    return env.value;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T): void {
  try {
    pruneIfNeeded();
    const env: CacheEnvelope<T> = { savedAt: Date.now(), lastUsed: Date.now(), value };
    localStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    // Cuota de localStorage llena: podar agresivamente y continuar sin caché.
    pruneIfNeeded(true);
  }
}

function pruneIfNeeded(aggressive = false): void {
  const keys: { k: string; lastUsed: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      try {
        const env = JSON.parse(localStorage.getItem(k)!) as CacheEnvelope<unknown>;
        keys.push({ k, lastUsed: env.lastUsed ?? 0 });
      } catch {
        localStorage.removeItem(k);
      }
    }
  }
  const limit = aggressive ? Math.floor(MAX_ENTRIES / 2) : MAX_ENTRIES;
  if (keys.length >= limit) {
    keys
      .sort((a, b) => a.lastUsed - b.lastUsed)
      .slice(0, keys.length - limit + 1)
      .forEach(({ k }) => localStorage.removeItem(k));
  }
}

export function cacheClearAll(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
