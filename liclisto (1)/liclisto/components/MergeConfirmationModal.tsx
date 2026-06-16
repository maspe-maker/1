import { CaseFolder, GeminiAnalysisResult } from '../types';
import { IconMerge, IconPlus, IconClose } from './Icons';

interface Props {
  existing: CaseFolder;
  analysis: GeminiAnalysisResult;
  onMerge: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export default function MergeConfirmationModal({ existing, analysis, onMerge, onCreateNew, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-tinta-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" role="dialog" aria-label="Conciliación de expediente duplicado">
      <div className="bg-papel-100 rounded-2xl shadow-legajo w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-display text-2xl font-semibold">Expediente ya registrado</h2>
          <button onClick={onCancel} aria-label="Cancelar" className="text-grafito hover:text-tinta p-1"><IconClose className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-grafito leading-relaxed">
          El número <span className="font-mono font-semibold text-tinta">{analysis.caseNumber}</span> ya
          existe en tu cartera ({existing.court}). ¿Quieres conciliar el nuevo acuerdo dentro de ese
          expediente o abrir uno aparte?
        </p>
        <div className="mt-5 space-y-3">
          <button onClick={onMerge} className="w-full flex items-center justify-center gap-2 bg-tinta text-papel rounded-lg px-4 py-3 font-medium hover:bg-tinta-700">
            <IconMerge className="w-4 h-4" /> Fusionar en el expediente existente
          </button>
          <button onClick={onCreateNew} className="w-full flex items-center justify-center gap-2 bg-white border border-papel-300 rounded-lg px-4 py-3 font-medium hover:border-tinta-500">
            <IconPlus className="w-4 h-4" /> Crear como expediente nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
