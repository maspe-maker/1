import { useEffect, useState } from 'react';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { monitor, MonitorEvent } from '../utils/monitoring';
import { cacheClearAll } from '../utils/cache';
import { setCustomHolidays } from '../utils/dateUtils';
import { remainingAnalysesToday } from '../services/geminiService';
import { IconClose, IconActivity, IconLogOut, IconTrash, IconDownload, IconCalendar } from './Icons';

interface Props { user: FirebaseUser; onClose: () => void; }

const HOLIDAYS_KEY = 'liclisto.customHolidays';

export default function SettingsModal({ user, onClose }: Props) {
  const [tab, setTab] = useState<'general' | 'monitor'>('general');
  const [events, setEvents] = useState<readonly MonitorEvent[]>(monitor.events());
  const [holidaysText, setHolidaysText] = useState(
    () => localStorage.getItem(HOLIDAYS_KEY) ?? '',
  );
  const [cacheCleared, setCacheCleared] = useState(false);

  // Monitoreo constante: el panel se refresca en vivo con cada evento.
  useEffect(() => monitor.subscribe(() => setEvents([...monitor.events()])), []);

  const saveHolidays = () => {
    const dates = holidaysText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    localStorage.setItem(HOLIDAYS_KEY, dates.join('\n'));
    setHolidaysText(dates.join('\n'));
    setCustomHolidays(dates);
    monitor.log('settings.holidays', 'info', `${dates.length} días inhábiles personalizados`);
  };

  const downloadDiagnostics = () => {
    const blob = new Blob([monitor.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liclisto-diagnostico-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const errorCount = events.filter((e) => e.level === 'error').length;

  return (
    <div className="fixed inset-0 z-50 bg-tinta-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" role="dialog" aria-label="Ajustes">
      <div className="bg-papel-100 rounded-2xl shadow-legajo w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-display text-2xl font-semibold">Ajustes</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-grafito hover:text-tinta p-1"><IconClose className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 px-6 border-b border-papel-300">
          {(['general', 'monitor'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${tab === t ? 'border-sello text-sello' : 'border-transparent text-grafito hover:text-tinta'}`}
            >
              {t === 'general' ? 'General' : `Monitoreo${errorCount ? ` (${errorCount}⚠)` : ''}`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {tab === 'general' ? (
            <>
              <section>
                <p className="text-sm font-semibold mb-1">Sesión</p>
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-papel-300">
                  {user.photoURL && <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.displayName ?? 'Lic.'}</p>
                    <p className="text-xs text-grafito truncate">{user.email}</p>
                  </div>
                  <button onClick={() => signOut(auth)} className="flex items-center gap-1.5 text-sm text-sello hover:text-sello-600 font-medium">
                    <IconLogOut className="w-4 h-4" /> Salir
                  </button>
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                  <IconCalendar className="w-4 h-4" /> Días inhábiles del despacho
                </p>
                <p className="text-xs text-grafito mb-2">
                  Una fecha por línea (AAAA-MM-DD): vacaciones del tribunal, suspensiones de labores,
                  etc. Se excluyen del cálculo de plazos.
                </p>
                <textarea
                  value={holidaysText}
                  onChange={(e) => setHolidaysText(e.target.value)}
                  rows={4}
                  placeholder={'2026-07-16\n2026-07-17'}
                  className="w-full border border-papel-300 rounded-lg p-3 bg-white font-mono text-sm outline-none focus:border-tinta"
                />
                <button onClick={saveHolidays} className="mt-2 bg-tinta text-papel rounded-lg px-4 py-2 text-sm font-medium hover:bg-tinta-700">
                  Guardar días inhábiles
                </button>
              </section>

              <section>
                <p className="text-sm font-semibold mb-1">Caché de análisis de IA</p>
                <p className="text-xs text-grafito mb-2">
                  Quedan <span className="font-mono font-semibold">{remainingAnalysesToday()}</span> análisis
                  hoy. Los documentos ya analizados se sirven desde caché sin consumir cuota.
                </p>
                <button
                  onClick={() => { cacheClearAll(); setCacheCleared(true); monitor.log('cache.cleared', 'info'); }}
                  className="flex items-center gap-1.5 text-sm border border-papel-300 bg-white rounded-lg px-4 py-2 hover:border-sello hover:text-sello"
                >
                  <IconTrash className="w-4 h-4" /> {cacheCleared ? 'Caché vaciada' : 'Vaciar caché local'}
                </button>
              </section>
            </>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <IconActivity className="w-4 h-4 text-olivo" /> Bitácora en vivo ({events.length})
                </p>
                <button onClick={downloadDiagnostics} className="flex items-center gap-1.5 text-xs text-tinta-700 hover:text-sello font-medium">
                  <IconDownload className="w-3.5 h-3.5" /> Exportar diagnóstico
                </button>
              </div>
              <ul className="space-y-1.5 font-mono text-xs">
                {[...events].reverse().map((e, i) => (
                  <li key={i} className={`rounded px-2.5 py-1.5 flex gap-2 ${e.level === 'error' ? 'bg-sello-100 text-sello' : e.level === 'warn' ? 'bg-ambar-100 text-ambar' : 'bg-white border border-papel-300 text-grafito'}`}>
                    <span className="shrink-0">{e.at.slice(11, 19)}</span>
                    <span className="font-semibold shrink-0">{e.name}</span>
                    {e.durationMs !== undefined && <span className="shrink-0">{e.durationMs}ms</span>}
                    <span className="truncate">{e.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
