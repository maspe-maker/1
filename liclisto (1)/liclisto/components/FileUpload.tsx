import { useRef, useState } from 'react';
import { GeminiAnalysisResult } from '../types';
import { analyzeLegalDocuments, remainingAnalysesToday } from '../services/geminiService';
import { RateLimitError } from '../utils/rateLimiter';
import { IconUpload, IconAI, IconFile, IconClose, IconSpinner, IconTrash } from './Icons';

interface Props {
  onAnalyzed: (analysis: GeminiAnalysisResult, files: File[]) => void;
  onClose: () => void;
}

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export default function FileUpload({ onAnalyzed, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => ACCEPTED.includes(f.type));
    if (valid.length < Array.from(incoming).length) {
      setError('Solo se aceptan PDF e imágenes (PNG, JPG, WEBP).');
    } else {
      setError('');
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const analyze = async () => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      const analysis = await analyzeLegalDocuments(files);
      onAnalyzed(analysis, files);
    } catch (e) {
      if (e instanceof RateLimitError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'El análisis falló. Inténtalo de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-tinta-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
      <div className="bg-papel-100 rounded-2xl shadow-legajo w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <IconAI className="w-5 h-5 text-sello" /> Analizar acuerdo
            </h2>
            <p className="text-sm text-grafito mt-1">
              Arrastra el acuerdo del juzgado; la IA extraerá expediente, plazos y estrategia.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-grafito hover:text-tinta p-1">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-sello bg-sello-100' : 'border-papel-300 bg-white hover:border-tinta-500'
          }`}
        >
          <IconUpload className="w-8 h-8 mx-auto text-tinta-500 mb-2" strokeWidth={1.5} />
          <p className="font-medium">Suelta aquí los PDF o imágenes</p>
          <p className="text-sm text-grafito">o haz clic para elegir archivos</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm border border-papel-300">
                <IconFile className="w-4 h-4 text-tinta-500 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-xs text-grafito font-mono">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  aria-label={`Quitar ${f.name}`}
                  className="text-grafito hover:text-sello"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-sello bg-sello-100 border border-sello/20 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-grafito font-mono">
            {remainingAnalysesToday()} análisis disponibles hoy
          </span>
          <button
            onClick={analyze}
            disabled={!files.length || busy}
            className="flex items-center gap-2 bg-tinta text-papel rounded-lg px-5 py-2.5 font-medium hover:bg-tinta-700 transition-colors disabled:opacity-50"
          >
            {busy ? (
              <>
                <IconSpinner className="w-4 h-4 animate-spin" /> Analizando…
              </>
            ) : (
              <>
                <IconAI className="w-4 h-4" /> Analizar con IA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
