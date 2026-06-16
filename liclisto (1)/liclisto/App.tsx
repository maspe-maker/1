import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { CaseFolder, GeminiAnalysisResult } from './types';
import {
  subscribeToCases,
  uploadCaseDocuments,
  createCaseFromAnalysis,
  mergeIntoExistingCase,
} from './services/caseService';
import { setCustomHolidays } from './utils/dateUtils';
import { monitor } from './utils/monitoring';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import CaseDetail from './components/CaseDetail';
import CalendarView from './components/CalendarView';
import FileUpload from './components/FileUpload';
import SettingsModal from './components/SettingsModal';
import MergeConfirmationModal from './components/MergeConfirmationModal';
import { IconScale, IconFolder, IconCalendar, IconSettings, IconAI, IconSpinner } from './components/Icons';

type View = 'dashboard' | 'calendar';

interface PendingAnalysis {
  analysis: GeminiAnalysisResult;
  files: File[];
  duplicate: CaseFolder | null;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cases, setCases] = useState<CaseFolder[]>([]);
  const [view, setView] = useState<View>('dashboard');
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pending, setPending] = useState<PendingAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState('');

  // Días inhábiles personalizados guardados por el despacho
  useEffect(() => {
    const stored = localStorage.getItem('liclisto.customHolidays');
    if (stored) setCustomHolidays(stored.split('\n').filter(Boolean));
  }, []);

  // Sesión reactiva
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
        if (u) monitor.log('auth.session', 'info', u.email ?? u.uid);
      }),
    [],
  );

  // Suscripción en tiempo real a la cartera del usuario (RLS espejo)
  useEffect(() => {
    if (!user) {
      setCases([]);
      return;
    }
    return subscribeToCases(
      user.uid,
      setCases,
      () => setBanner('No se pudo sincronizar con la nube. Mostrando datos locales.'),
    );
  }, [user]);

  const openCase = cases.find((c) => c.id === openCaseId) ?? null;

  // Flujo: análisis listo → detectar duplicado → fusionar o crear
  const handleAnalyzed = (analysis: GeminiAnalysisResult, files: File[]) => {
    setShowUpload(false);
    const duplicate =
      cases.find(
        (c) => c.caseNumber.trim().toLowerCase() === analysis.caseNumber.trim().toLowerCase(),
      ) ?? null;
    if (duplicate) {
      setPending({ analysis, files, duplicate });
    } else {
      void persist(analysis, files, null);
    }
  };

  const persist = async (
    analysis: GeminiAnalysisResult,
    files: File[],
    mergeTarget: CaseFolder | null,
  ) => {
    if (!user) return;
    setSaving(true);
    setBanner('');
    try {
      const documents = await uploadCaseDocuments(user.uid, files);
      if (mergeTarget) {
        await mergeIntoExistingCase(mergeTarget, analysis, documents);
        setOpenCaseId(mergeTarget.id);
      } else {
        await createCaseFromAnalysis(user.uid, analysis, documents);
      }
      setView('dashboard');
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'No se pudo guardar el expediente.');
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-papel">
        <IconSpinner className="w-7 h-7 animate-spin text-tinta" aria-label="Cargando" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-papel">
      {/* Encabezado */}
      <header className="bg-papel/80 backdrop-blur border-b border-papel-300 sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => { setView('dashboard'); setOpenCaseId(null); }}
            className="flex items-center gap-2"
            aria-label="Ir al inicio"
          >
            <IconScale className="w-6 h-6 text-sello" strokeWidth={1.5} />
            <span className="font-display text-xl font-semibold tracking-tight">LicListo</span>
          </button>

          <nav className="flex items-center gap-1" aria-label="Principal">
            <NavButton active={view === 'dashboard' && !openCaseId} onClick={() => { setView('dashboard'); setOpenCaseId(null); }} icon={<IconFolder className="w-4 h-4" />} label="Cartera" />
            <NavButton active={view === 'calendar' && !openCaseId} onClick={() => { setView('calendar'); setOpenCaseId(null); }} icon={<IconCalendar className="w-4 h-4" />} label="Calendario" />
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-sello text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-sello-600"
            >
              <IconAI className="w-4 h-4" /> <span className="hidden sm:inline">Analizar acuerdo</span>
            </button>
            <button onClick={() => setShowSettings(true)} aria-label="Ajustes" className="p-2 rounded-lg hover:bg-papel-300 text-tinta-700">
              <IconSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Avisos */}
      {banner && (
        <div role="alert" className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 print:hidden">
          <p className="bg-sello-100 border border-sello/20 text-sello text-sm rounded-lg p-3">{banner}</p>
        </div>
      )}
      {saving && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 print:hidden">
          <p className="bg-ambar-100 border border-ambar/20 text-ambar text-sm rounded-lg p-3 flex items-center gap-2">
            <IconSpinner className="w-4 h-4 animate-spin" /> Guardando expediente y respaldando documentos…
          </p>
        </div>
      )}

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        {openCase ? (
          <CaseDetail caseFolder={openCase} onBack={() => setOpenCaseId(null)} />
        ) : view === 'calendar' ? (
          <CalendarView cases={cases} onOpenCase={(c) => setOpenCaseId(c.id)} />
        ) : (
          <Dashboard cases={cases} onOpenCase={(c) => setOpenCaseId(c.id)} onNewAnalysis={() => setShowUpload(true)} />
        )}
      </main>

      {/* Modales */}
      {showUpload && <FileUpload onAnalyzed={handleAnalyzed} onClose={() => setShowUpload(false)} />}
      {showSettings && <SettingsModal user={user} onClose={() => setShowSettings(false)} />}
      {pending?.duplicate && (
        <MergeConfirmationModal
          existing={pending.duplicate}
          analysis={pending.analysis}
          onMerge={() => void persist(pending.analysis, pending.files, pending.duplicate)}
          onCreateNew={() => void persist(pending.analysis, pending.files, null)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-tinta text-papel' : 'text-tinta-700 hover:bg-papel-300'}`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
