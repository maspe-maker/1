import { useMemo, useState } from 'react';
import { CaseFolder } from '../types';
import { businessDaysUntil, parseISODate, formatShortDate } from '../utils/dateUtils';
import { IconSearch, IconFolder, IconAlert, IconClock, IconBriefcase, IconAI } from './Icons';

interface Props {
  cases: CaseFolder[];
  onOpenCase: (c: CaseFolder) => void;
  onNewAnalysis: () => void;
}

type Filter = 'todos' | 'urgentes' | 'laboral';

export default function Dashboard({ cases, onOpenCase, onNewAnalysis }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

  const enriched = useMemo(
    () =>
      cases.map((c) => {
        const pending = c.timelineEvents
          .filter((e) => e.type === 'Deadline')
          .map((e) => ({ ...e, remaining: businessDaysUntil(parseISODate(e.date)) }))
          .sort((a, b) => a.remaining - b.remaining);
        const next = pending.find((p) => p.remaining >= 0) ?? pending[0];
        return { c, next, urgent: next !== undefined && next.remaining <= 3 };
      }),
    [cases],
  );

  const visible = enriched.filter(({ c, urgent }) => {
    if (filter === 'urgentes' && !urgent) return false;
    if (filter === 'laboral' && !c.isLabor) return false;
    if (!search) return true;
    const haystack = [c.caseNumber, c.court, c.trialType, c.client, c.company, c.workerName, ...c.parties]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const urgentCount = enriched.filter((e) => e.urgent).length;
  const overdueCount = enriched.filter((e) => e.next && e.next.remaining < 0).length;

  return (
    <div>
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Metric icon={<IconFolder className="w-5 h-5 text-tinta-500" />} label="Expedientes activos" value={cases.length} />
        <Metric icon={<IconClock className="w-5 h-5 text-ambar" />} label="Plazos ≤ 3 días hábiles" value={urgentCount} highlight={urgentCount > 0 ? 'ambar' : undefined} />
        <Metric icon={<IconAlert className="w-5 h-5 text-sello" />} label="Plazos vencidos" value={overdueCount} highlight={overdueCount > 0 ? 'sello' : undefined} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-grafito" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por expediente, juzgado, parte, cliente o empresa…"
            className="w-full bg-white border border-papel-300 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-tinta"
            aria-label="Buscar expedientes"
          />
        </div>
        <div className="flex gap-1 bg-white border border-papel-300 rounded-lg p-1">
          {(['todos', 'urgentes', 'laboral'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-tinta text-papel' : 'text-grafito hover:text-tinta'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cartera */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-legajo p-12 text-center">
          <IconFolder className="w-10 h-10 mx-auto text-papel-300 mb-3" strokeWidth={1.2} />
          <p className="font-display text-xl font-semibold">
            {cases.length === 0 ? 'Tu cartera está vacía' : 'Sin coincidencias'}
          </p>
          <p className="text-sm text-grafito mt-1 mb-5">
            {cases.length === 0
              ? 'Arrastra tu primer acuerdo de juzgado y deja que la IA arme el expediente.'
              : 'Ajusta la búsqueda o cambia el filtro.'}
          </p>
          {cases.length === 0 && (
            <button onClick={onNewAnalysis} className="inline-flex items-center gap-2 bg-sello text-white rounded-lg px-5 py-2.5 font-medium hover:bg-sello-600">
              <IconAI className="w-4 h-4" /> Analizar mi primer acuerdo
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {visible.map(({ c, next }) => {
            const overdue = next !== undefined && next.remaining < 0;
            const urgent = next !== undefined && next.remaining >= 0 && next.remaining <= 3;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onOpenCase(c)}
                  className={`w-full text-left bg-white rounded-xl shadow-legajo p-5 border-l-4 transition-transform hover:-translate-y-0.5
                    ${overdue ? 'border-sello' : urgent ? 'border-ambar' : 'border-olivo'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-tinta">{c.caseNumber}</span>
                        <span className="text-[10px] uppercase tracking-widest font-semibold bg-papel px-2 py-0.5 rounded text-tinta-700">{c.trialType}</span>
                        {c.isLabor && (
                          <span className="text-[10px] uppercase tracking-widest font-semibold bg-olivo-100 text-olivo px-2 py-0.5 rounded inline-flex items-center gap-1">
                            <IconBriefcase className="w-3 h-3" /> Laboral
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-grafito mt-1 truncate">{c.court}</p>
                      <p className="text-sm mt-1.5 line-clamp-2 max-w-2xl">{c.generalStatusSummary}</p>
                    </div>
                    {next && (
                      <div className={`shrink-0 text-right rounded-lg px-3 py-2 ${overdue ? 'bg-sello-100' : urgent ? 'bg-ambar-100' : 'bg-papel-100'}`}>
                        <p className={`font-mono text-lg font-semibold leading-none ${overdue ? 'text-sello' : urgent ? 'text-ambar' : 'text-olivo'}`}>
                          {overdue ? `−${Math.abs(next.remaining)}` : next.remaining}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-grafito mt-1">
                          {overdue ? 'días vencido' : 'días hábiles'}
                        </p>
                        <p className="text-[10px] font-mono text-grafito">{formatShortDate(next.date)}</p>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Metric({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: 'sello' | 'ambar' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-legajo p-5 flex items-center gap-4 ${highlight === 'sello' ? 'ring-1 ring-sello/30' : highlight === 'ambar' ? 'ring-1 ring-ambar/30' : ''}`}>
      <div className="bg-papel-100 rounded-xl p-3">{icon}</div>
      <div>
        <p className="font-display text-3xl font-semibold leading-none">{value}</p>
        <p className="text-xs text-grafito mt-1">{label}</p>
      </div>
    </div>
  );
}
