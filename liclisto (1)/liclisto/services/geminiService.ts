import { GoogleGenAI, Type } from '@google/genai';
import { GeminiAnalysisResult } from '../types';
import { geminiRateLimiter, withRetry } from '../utils/rateLimiter';
import { hashFiles, cacheGet, cacheSet } from '../utils/cache';
import { monitor } from '../utils/monitoring';

let aiInstance: GoogleGenAI | null = null;
const getAi = () => {
  if (!aiInstance && process.env.API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    caseNumber: { type: Type.STRING, description: 'Número de expediente (ej. 123/2023).' },
    court: { type: Type.STRING, description: 'Juzgado o Junta de Conciliación completo.' },
    trialType: { type: Type.STRING, description: 'Tipo de juicio (ej. Ordinario Laboral, Amparo).' },
    parties: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Lista de partes: [Actor, Demandado].' },
    agreementSummary: { type: Type.STRING, description: 'Resumen ejecutivo del contenido legal.' },
    generalStatusSummary: { type: Type.STRING, description: 'Estado procesal actual del juicio tras estos documentos.' },
    client: { type: Type.STRING, description: 'Identificar cuál de las partes parece ser el cliente.' },
    isLabor: { type: Type.BOOLEAN, description: 'True si el contexto es de derecho laboral mexicano.' },
    company: { type: Type.STRING, description: 'Nombre de la empresa si es un caso laboral.' },
    workerName: { type: Type.STRING, description: 'Nombre del trabajador si es un caso laboral.' },
    recommendedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          legalBasis: { type: Type.STRING, description: 'Fundamento legal (LFT, Constitución, etc.).' },
          jurisprudence: { type: Type.STRING, description: 'Cita de Jurisprudencia aplicable.' },
        },
        required: ['action', 'legalBasis'],
      },
    },
    deadline: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.INTEGER, description: 'Número de días hábiles.' },
        termDescription: { type: Type.STRING, description: 'Descripción textual del plazo.' },
        description: { type: Type.STRING, description: 'Descripción breve de la obligación.' },
      },
      required: ['days', 'termDescription', 'description'],
    },
  },
  required: ['caseNumber', 'court', 'trialType', 'parties', 'agreementSummary', 'generalStatusSummary', 'recommendedActions'],
};

/**
 * Analiza acuerdos de juzgados mexicanos con Gemini.
 * Pipeline: caché por hash → rate limiter → llamada con reintentos → caché.
 */
export const analyzeLegalDocuments = async (files: File[]): Promise<GeminiAnalysisResult> => {
  // 1) CACHÉ — mismos archivos, resultado instantáneo sin tocar la API.
  const fingerprint = await hashFiles(files);
  const cached = cacheGet<GeminiAnalysisResult>(fingerprint);
  if (cached) {
    monitor.log('gemini.cache_hit', 'info', `hash ${fingerprint.slice(0, 12)}…`);
    return cached;
  }

  // 2) RATE LIMITING — lanza RateLimitError si se excede ráfaga o cuota diaria.
  geminiRateLimiter.acquire();

  const fileParts = await Promise.all(
    files.map(async (file) => {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
        reader.readAsDataURL(file);
      });
      return { inlineData: { data: base64Data, mimeType: file.type } };
    }),
  );

  const prompt =
    'Analiza estos documentos de juzgados mexicanos. Responde estrictamente respetando el esquema JSON sugerido. Detalla plazos fatales y fundamentos de la legislación mexicana.';

  const ai = getAi();
  if (!ai) throw new Error('API Key no inicializada. Define GEMINI_API_KEY en tu archivo .env.');

  // 3) LLAMADA con trazas de latencia y reintentos ante errores transitorios.
  const result = await monitor.trace('gemini.analyze', () =>
    withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [...fileParts, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });
      return JSON.parse((response.text ?? '').trim()) as GeminiAnalysisResult;
    }),
  );

  // 4) Guardar en caché para análisis repetidos.
  cacheSet(fingerprint, result);
  return result;
};

/** Cupos de análisis restantes hoy (para mostrar en la UI). */
export const remainingAnalysesToday = () => geminiRateLimiter.remainingToday();
