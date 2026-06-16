import { TimelineEvent } from '../types';
import { formatShortDate, parseISODate, businessDaysUntil } from '../utils/dateUtils';
import { IconGavel, IconClock, IconUsers } from './Icons';

const TYPE_META: Record<TimelineEvent['type'], { label: string; color: string; Icon: typeof IconGavel }> = {
  Agreement: { label: 'Acuerdo', color: 'bg-tinta', Icon: IconGavel },
  Deadline: { label: 'Plazo fatal', color: 'bg-sello', Icon: IconClock },
  Hearing: { label: 'Audiencia', color: 'bg-ambar', Icon: IconUsers },
};

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    return <p className="text-sm text-grafito">Sin actuaciones registradas todavía.</p>;
  }

  return (
    <ol className="relative border-l-2 border-papel-300 ml-3 space-y-6">
      {sorted.map((ev) => {
        const meta = TYPE_META[ev.type];
        const isDeadline = ev.type === 'Deadline';
        const remaining = isDeadline ? businessDaysUntil(parseISODate(ev.date)) : null;
        const overdue = isDeadline && remaining !== null && remaining < 0;
        return (
          <li key={ev.id} className="ml-6 avoid-break">
            <span className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${overdue ? 'bg-sello-600 animate-pulse' : meta.color}`}>
              <meta.Icon className="w-3 h-3 text-papel" />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <time className="font-mono text-xs text-grafito">{formatShortDate(ev.date)}</time>
              <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${isDeadline ? 'bg-sello-100 text-sello' : 'bg-papel-300 text-tinta-700'}`}>
                {meta.label}
              </span>
              {isDeadline && remaining !== null && (
                <span className={`text-xs font-mono font-semibold ${overdue ? 'text-sello' : remaining <= 3 ? 'text-ambar' : 'text-olivo'}`}>
                  {overdue ? `VENCIDO hace ${Math.abs(remaining)} día(s) hábil(es)` : remaining === 0 ? 'VENCE HOY' : `${remaining} día(s) hábil(es) restantes`}
                </span>
              )}
            </div>
            <h4 className="font-semibold mt-1">{ev.title}</h4>
            <p className="text-sm text-grafito mt-0.5 leading-relaxed">{ev.description}</p>
            {ev.term && <p className="text-xs font-mono text-tinta-500 mt-1">Término: {ev.term}{ev.startDate ? ` · corre desde ${formatShortDate(ev.startDate)}` : ''}</p>}
          </li>
        );
      })}
    </ol>
  );
}
