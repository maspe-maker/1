// ─────────────────────────────────────────────────────────────
// LicListo · Motor de cálculo de plazos en días hábiles
// Salta sábados, domingos y días inhábiles del calendario
// judicial mexicano (descanso obligatorio art. 74 LFT +
// inhábiles habituales del Poder Judicial).
// ─────────────────────────────────────────────────────────────

/** Festivos fijos (MM-DD) inhábiles cada año. */
const FIXED_HOLIDAYS = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '09-16', // Independencia
  '11-02', // Día de Muertos (inhábil judicial habitual)
  '12-25', // Navidad
];

/** N-ésimo día de la semana de un mes (p. ej. 1.er lunes de febrero). */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

/** Festivos móviles por año: Constitución, Natalicio de Juárez, Revolución. */
function movableHolidays(year: number): string[] {
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [
    fmt(nthWeekday(year, 1, 1, 1)),  // 1.er lunes de febrero
    fmt(nthWeekday(year, 2, 1, 3)),  // 3.er lunes de marzo
    fmt(nthWeekday(year, 10, 1, 3)), // 3.er lunes de noviembre
  ];
}

/** Días inhábiles adicionales definidos por el despacho (ISO YYYY-MM-DD). */
let customHolidays: Set<string> = new Set();
export const setCustomHolidays = (isoDates: string[]) => {
  customHolidays = new Set(isoDates);
};

export const isHoliday = (date: Date): boolean => {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const iso = toISODate(date);
  return (
    FIXED_HOLIDAYS.includes(mmdd) ||
    movableHolidays(date.getFullYear()).includes(mmdd) ||
    customHolidays.has(iso)
  );
};

export const isBusinessDay = (date: Date): boolean => {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false; // domingo o sábado
  return !isHoliday(date);
};

/** Suma `days` días hábiles a partir de `startDate` (el plazo corre al día siguiente). */
export const addBusinessDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) addedDays++;
  }
  return result;
};

/** Días hábiles restantes entre hoy y `deadline` (negativo si ya venció). */
export const businessDaysUntil = (deadline: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  if (end.getTime() === today.getTime()) return 0;
  const sign = end > today ? 1 : -1;
  let count = 0;
  const cursor = new Date(today);
  while (cursor.getTime() !== end.getTime()) {
    cursor.setDate(cursor.getDate() + sign);
    if (isBusinessDay(cursor)) count += sign;
  }
  return count;
};

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const formatLongDate = (iso: string): string =>
  parseISODate(iso).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatShortDate = (iso: string): string =>
  parseISODate(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
