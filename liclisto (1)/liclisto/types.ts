// ─────────────────────────────────────────────────────────────
// LicListo · Núcleo relacional de la plataforma
// ─────────────────────────────────────────────────────────────

export interface User {
  name: string;
  email: string;
  avatarUrl: string;
  phone?: string;
}

export interface RecommendedAction {
  action: string;
  legalBasis: string;
  jurisprudence?: string;
}

export interface AttachedDocument {
  name: string;
  url: string;
  type: string;
}

export interface Agreement {
  id: string;
  date: string;
  summary: string;
  recommendedActions: RecommendedAction[];
  documents: AttachedDocument[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'Agreement' | 'Deadline' | 'Hearing';
  title: string;
  description: string;
  isOverdue?: boolean;
  startDate?: string;
  term?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  details: string;
}

export interface CaseFolder {
  id: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  caseNumber: string;
  court: string;
  trialType: string;
  generalStatusSummary: string;
  agreements: Agreement[];
  timelineEvents: TimelineEvent[];
  changeHistory: HistoryEntry[];
  parties: string[];
  client?: string;
  year?: string;
  // Específico para rama Laboral
  isLabor?: boolean;
  company?: string;
  workerName?: string;
}

export interface GeminiAnalysisResult {
  caseNumber: string;
  court: string;
  trialType: string;
  parties: string[];
  agreementSummary: string;
  generalStatusSummary: string;
  recommendedActions: RecommendedAction[];
  client?: string;
  isLabor?: boolean;
  company?: string;
  workerName?: string;
  deadline?: {
    days: number;
    termDescription: string;
    description: string;
  };
}

export interface NewAgreementPayload {
  analysisResult: GeminiAnalysisResult;
  documents: AttachedDocument[];
}
