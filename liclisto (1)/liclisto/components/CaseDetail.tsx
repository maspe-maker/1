import { useState } from 'react';
import { CaseFolder, AttachedDocument } from '../types';
import Timeline from './Timeline';
import DocumentViewerModal from './DocumentViewerModal';
import { formatShortDate } from '../utils/dateUtils';
import { appendHistory, deleteCase } from '../services/caseService';
import {
  IconBack, IconPrint, IconTrash, IconGavel, IconLaw, IconFile, IconEye,
  IconBriefcase, IconUsers, IconCheck,
} from './Icons';

interface Props { caseFolder: CaseFolder; onBack: () => void; }

export default function CaseDetail({ caseFolder: c, onBack }: Props) {
  const [viewing, setViewing] = useState<AttachedDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handlePrint = async () => {
    await appendHistory(c, 'Impresión', 'Reporte del expediente enviado a impresión.');
    window.print();
  };

  const handleDelete = async () => {
    await deleteCase(c.id);
    onBack();
  };

  return (
    <div className="print:p-0">
      {/* Barra de acciones (oculta al imprimir) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-tinta-700 hover:text-sello">
          <IconBack className="w-4 h-4" /> Volver a la cartera
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-sm bg-white border border-papel-300 rounded-lg px-4 py-2 hover:border-tinta-500">
            <IconPrint className="w-4 h-4" /> Imprimir reporte
          </button>
          {confirmDelete ? (
            <button onClick={handleDelete} className="flex items-center gap-1.5 text-sm bg-sello text-white rounded-lg px-4 py-2 hover:bg-sello-600">
              <IconTrash className="w-4 h-4" /> Confirmar eliminación
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm bg-white border border-papel-300 rounded-lg px-4 py-2 text-sello hover:border-sello">
              <IconTrash className="w-4 h-4" /> Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Carátula del expediente */}
      <header className="bg-tinta-900 text-papel rounded-2xl p-6 mb-6 print:bg-white print:text-tinta print:border print:border-tinta print:rounded-none avoid-break">
        <p className="font-mono text-ambar text-sm print:text-tinta">{c.trialType.toUpperCase()}</p>
        <h1 className="font-display text-4xl font-semibold mt-1">Exp. {c.caseNumber}</h1>
        <p className="text-papel-300 mt-1 print:text-grafito">{c.court}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm">
          <span className="flex items-center gap-1.5"><IconUsers className="w-4 h-4 text-ambar print:text-tinta" /> {c.parties.join(' vs. ')}</span>
          {c.client && <span className="flex items-center gap-1.5"><IconCheck className="w-4 h-4 text-ambar print:text-tinta" /> Cliente: {c.client}</span>}
          {c.isLabor && (
            <span className="flex items-center gap-1.5">
              <IconBriefcase className="w-4 h-4 text-ambar print:text-tinta" /> Laboral{c.company ? ` · ${c.company}` : ''}{c.workerName ? ` · ${c.workerName}` : ''}
            </span>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Estado procesal */}
          <section className="bg-white rounded-2xl shadow-legajo p-6 avoid-break">
            <h2 className="font-display text-xl font-semibold mb-2 flex items-center gap-2">
              <IconGavel className="w-5 h-5 text-sello" /> Estado procesal
            </h2>
            <p className="text-sm leading-relaxed text-grafito">{c.generalStatusSummary}</p>
          </section>

          {/* Acuerdos */}
          <section className="bg-white rounded-2xl shadow-legajo p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Acuerdos ({c.agreements.length})</h2>
            <div className="space-y-5">
              {[...c.agreements].reverse().map((a) => (
                <article key={a.id} className="border border-papel-300 rounded-xl p-4 avoid-break">
                  <time className="font-mono text-xs text-grafito">{formatShortDate(a.date)}</time>
                  <p className="text-sm mt-1 leading-relaxed">{a.summary}</p>

                  {a.recommendedActions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-tinta-500">Estrategia sugerida</p>
                      {a.recommendedActions.map((ra, i) => (
                        <div key={i} className="bg-papel-100 rounded-lg p-3">
                          <p className="text-sm font-medium">{ra.action}</p>
                          <p className="text-xs text-grafito mt-1 flex items-start gap-1.5">
                            <IconLaw className="w-3.5 h-3.5 mt-0.5 shrink-0 text-olivo" />
                            <span><span className="font-semibold">Fundamento:</span> {ra.legalBasis}{ra.jurisprudence ? ` · Jurisprudencia: ${ra.jurisprudence}` : ''}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {a.documents.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                      {a.documents.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setViewing(d)}
                          className="flex items-center gap-1.5 text-xs bg-white border border-papel-300 rounded-lg px-3 py-1.5 hover:border-tinta-500"
                        >
                          <IconFile className="w-3.5 h-3.5 text-tinta-500" />
                          <span className="max-w-[180px] truncate">{d.name}</span>
                          <IconEye className="w-3.5 h-3.5 text-grafito" />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* Bitácora */}
          <section className="bg-white rounded-2xl shadow-legajo p-6 avoid-break">
            <h2 className="font-display text-xl font-semibold mb-3">Bitácora de cambios</h2>
            <ul className="space-y-2">
              {[...c.changeHistory].reverse().map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <time className="font-mono text-xs text-grafito shrink-0 w-32">{new Date(h.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</time>
                  <span><span className="font-semibold">{h.action}:</span> <span className="text-grafito">{h.details}</span></span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Línea de tiempo */}
        <aside className="bg-white rounded-2xl shadow-legajo p-6 h-fit avoid-break">
          <h2 className="font-display text-xl font-semibold mb-4">Línea de tiempo</h2>
          <Timeline events={c.timelineEvents} />
        </aside>
      </div>

      {viewing && <DocumentViewerModal document={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
