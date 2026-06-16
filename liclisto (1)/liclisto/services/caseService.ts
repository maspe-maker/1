import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import {
  CaseFolder,
  GeminiAnalysisResult,
  AttachedDocument,
  Agreement,
  TimelineEvent,
  HistoryEntry,
} from '../types';
import { addBusinessDays, toISODate } from '../utils/dateUtils';
import { monitor } from '../utils/monitoring';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Suscripción reactiva: SOLO los expedientes del usuario (espejo de las reglas RLS). */
export const subscribeToCases = (
  userId: string,
  onData: (cases: CaseFolder[]) => void,
  onError: (e: Error) => void,
): Unsubscribe => {
  const q = query(collection(db, 'cases'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const cases = snap.docs.map((d) => ({ ...(d.data() as Omit<CaseFolder, 'id'>), id: d.id }));
      cases.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      onData(cases);
    },
    (err) => {
      monitor.log('firestore.subscribe', 'error', err.message);
      onError(err);
    },
  );
};

/** Sube documentos del acuerdo a la carpeta privada del usuario en Storage. */
export const uploadCaseDocuments = async (
  userId: string,
  files: File[],
): Promise<AttachedDocument[]> =>
  monitor.trace('storage.upload', async () =>
    Promise.all(
      files.map(async (file) => {
        const path = `users/${userId}/cases/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        return { name: file.name, url, type: file.type };
      }),
    ),
  );

/** Construye acuerdo + eventos de línea de tiempo a partir del análisis de IA. */
export const buildAgreementArtifacts = (
  analysis: GeminiAnalysisResult,
  documents: AttachedDocument[],
): { agreement: Agreement; events: TimelineEvent[]; history: HistoryEntry } => {
  const today = toISODate(new Date());

  const agreement: Agreement = {
    id: uid(),
    date: today,
    summary: analysis.agreementSummary,
    recommendedActions: analysis.recommendedActions,
    documents,
  };

  const events: TimelineEvent[] = [
    {
      id: uid(),
      date: today,
      type: 'Agreement',
      title: 'Acuerdo registrado',
      description: analysis.agreementSummary,
    },
  ];

  if (analysis.deadline) {
    const due = addBusinessDays(new Date(), analysis.deadline.days);
    events.push({
      id: uid(),
      date: toISODate(due),
      type: 'Deadline',
      title: `Plazo fatal: ${analysis.deadline.description}`,
      description: analysis.deadline.termDescription,
      startDate: today,
      term: `${analysis.deadline.days} días hábiles`,
    });
  }

  const history: HistoryEntry = {
    id: uid(),
    date: new Date().toISOString(),
    action: 'Análisis con IA',
    details: `Acuerdo procesado (${documents.length} documento(s) adjunto(s)).`,
  };

  return { agreement, events, history };
};

/** Crea un expediente nuevo a partir del análisis. */
export const createCaseFromAnalysis = async (
  userId: string,
  analysis: GeminiAnalysisResult,
  documents: AttachedDocument[],
): Promise<void> => {
  const { agreement, events, history } = buildAgreementArtifacts(analysis, documents);
  const now = new Date().toISOString();

  const newCase: Omit<CaseFolder, 'id'> = {
    userId,
    createdAt: now,
    updatedAt: now,
    caseNumber: analysis.caseNumber,
    court: analysis.court,
    trialType: analysis.trialType,
    generalStatusSummary: analysis.generalStatusSummary,
    agreements: [agreement],
    timelineEvents: events,
    changeHistory: [
      history,
      { id: uid(), date: now, action: 'Apertura', details: 'Expediente creado en LicListo.' },
    ],
    parties: analysis.parties,
    client: analysis.client ?? '',
    year: analysis.caseNumber.split('/')[1] ?? String(new Date().getFullYear()),
    isLabor: analysis.isLabor ?? false,
    company: analysis.company ?? '',
    workerName: analysis.workerName ?? '',
  };

  await monitor.trace('firestore.createCase', () => addDoc(collection(db, 'cases'), newCase) as Promise<unknown>);
};

/** Fusiona un nuevo acuerdo dentro de un expediente existente (conciliación de duplicados). */
export const mergeIntoExistingCase = async (
  existing: CaseFolder,
  analysis: GeminiAnalysisResult,
  documents: AttachedDocument[],
): Promise<void> => {
  const { agreement, events, history } = buildAgreementArtifacts(analysis, documents);

  await monitor.trace('firestore.mergeCase', () =>
    updateDoc(doc(db, 'cases', existing.id), {
      updatedAt: new Date().toISOString(),
      generalStatusSummary: analysis.generalStatusSummary || existing.generalStatusSummary,
      agreements: [...existing.agreements, agreement],
      timelineEvents: [...existing.timelineEvents, ...events],
      changeHistory: [
        ...existing.changeHistory,
        history,
        {
          id: uid(),
          date: new Date().toISOString(),
          action: 'Fusión',
          details: `Nuevo acuerdo conciliado en el expediente ${existing.caseNumber}.`,
        },
      ],
    }),
  );
};

/** Registra una entrada manual en la bitácora del expediente. */
export const appendHistory = async (c: CaseFolder, action: string, details: string) =>
  updateDoc(doc(db, 'cases', c.id), {
    updatedAt: new Date().toISOString(),
    changeHistory: [
      ...c.changeHistory,
      { id: uid(), date: new Date().toISOString(), action, details },
    ],
  });

export const deleteCase = async (caseId: string) =>
  monitor.trace('firestore.deleteCase', () => deleteDoc(doc(db, 'cases', caseId)));
