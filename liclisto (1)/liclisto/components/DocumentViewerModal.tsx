import { AttachedDocument } from '../types';
import { IconClose, IconDownload } from './Icons';

interface Props { document: AttachedDocument; onClose: () => void; }

export default function DocumentViewerModal({ document: docFile, onClose }: Props) {
  const isPdf = docFile.type === 'application/pdf';
  return (
    <div className="fixed inset-0 z-50 bg-tinta-900/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" role="dialog" aria-label={`Visor: ${docFile.name}`}>
      <div className="bg-papel-100 rounded-2xl shadow-legajo w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-papel-300 bg-white">
          <p className="font-medium truncate">{docFile.name}</p>
          <div className="flex items-center gap-2">
            <a href={docFile.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-tinta-700 hover:text-sello px-3 py-1.5">
              <IconDownload className="w-4 h-4" /> Descargar
            </a>
            <button onClick={onClose} aria-label="Cerrar visor" className="text-grafito hover:text-tinta p-1.5">
              <IconClose className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-grafito/10">
          {isPdf ? (
            <iframe src={docFile.url} title={docFile.name} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img src={docFile.url} alt={docFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-legajo" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
