import { useMemo, useState } from 'react';
import { CaseFolder, TimelineEvent } from '../types';
import { isBusinessDay, toISODate, formatLongDate } from '../utils/dateUtils';
import { IconBack, IconNext, IconClock } from './Icons';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  cases: CaseFolder[];
  onOpenCase: (c: CaseFolder) => void;
}

interface DeadlineItem { event: TimelineEvent; caseFolder: CaseFolder; }

export default function CalendarView({ cases, onOpenCase }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const c of cases) {
      for (const ev of c.timelineEvents) {
        if (ev.type !== 'Deadline' && ev.type !== 'Hearing') continue;
        const list = map.get(ev.date) ?? [];
        list.push({ event: ev, caseFolder: c });
        map.set(ev.date, list);
      }
    }
    return map;
  }, [cases]);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7; // semana inicia en lunes

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const navigate = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const selectedItems = selected ? deadlinesByDate.get(selected) ?? [] : [];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-white rounded-2xl shadow-legajo p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold">
            {MONTHS[month]} <span className="text-grafito font-mono text-lg">{year}</span>
          </h2>
          <div className="flex gap-1">
            <button onClick={() => navigate(-1)} aria-label="Mes anterior" className="p-2 rounded-lg hover:bg-papel"><IconBack className="w-5 h-5" /></button>
            <button onClick={() => navigate(1)} aria-label="Mes siguiente" className="p-2 rounded-lg hover:bg-papel"><IconNext className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-grafito mb-2">
          {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`b-${i}`} />;
            const iso = toISODate(date);
            const items = deadlinesByDate.get(iso) ?? [];
            const inhabil = !isBusinessDay(date);
            const isToday = iso === toISODate(today);
            const isSelected = iso === selected;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={`relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors
                  ${isSelected ? 'bg-tinta text-papel' : isToday ? 'bg-ambar-100 font-bold' : inhabil ? 'bg-papel text-grafito/50' : 'bg-papel-100 hover:bg-papel-300'}`}
                aria-label={`${formatLongDate(iso)}${items.length ? `, ${items.length} plazo(s)` : ''}`}
              >
                <span className="font-mono">{date.getDate()}</span>
                {items.length > 0 && (
                  <span className={`absolute bottom-1.5 flex gap-0.5`}>
                    {items.slice(0, 3).map((_, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-papel' : 'bg-sello'}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-grafito flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sello inline-block" /> Plazo fatal / audiencia</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-papel inline-block border border-papel-300" /> Día inhábil</span>
        </p>
      </div>

      <aside className="bg-white rounded-2xl shadow-legajo p-5">
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <IconClock className="w-4 h-4 text-sello" />
          {selected ? formatLongDate(selected) : 'Selecciona un día'}
        </h3>
        {selected && selectedItems.length === 0 && (
          <p className="text-sm text-grafito">Sin plazos ni audiencias este día. Respira, Lic.</p>
        )}
        <ul className="space-y-3">
          {selectedItems.map(({ event, caseFolder }) => (
            <li key={event.id}>
              <button
                onClick={() => onOpenCase(caseFolder)}
                className="w-full text-left bg-papel-100 hover:bg-papel rounded-lg p-3 border border-papel-300"
              >
                <p className="font-mono text-xs text-sello font-semibold">{caseFolder.caseNumber}</p>
                <p className="font-medium text-sm mt-0.5">{event.title}</p>
                <p className="text-xs text-grafito mt-0.5 line-clamp-2">{event.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
