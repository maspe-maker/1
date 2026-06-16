# ⚖️ LicListo

**Centro de control para despachos jurídicos mexicanos**: ingesta de acuerdos de juzgado con IA (Gemini), gestión de expedientes, plazos fatales en días hábiles, calendario judicial y aislamiento total de datos por usuario.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Autenticación | Firebase Auth (Google, Microsoft, Apple, Magic Link) |
| Base de datos | Cloud Firestore con **Row-Level Security** (`firestore.rules`) |
| Archivos | Firebase Storage (carpeta privada por usuario) |
| IA | `@google/genai` con JSON Schema estricto |
| Hosting | Firebase Hosting (plan gratuito Spark) |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |

## Capas transversales incluidas

- **Build comprimido sin source maps** — `vite.config.ts`: `sourcemap: false`, minificación esbuild, `console.*` eliminados, code-splitting de vendors con hash para caché HTTP. El workflow de CI **falla el deploy** si detecta algún `.map` en `dist/`.
- **RLS (seguridad a nivel de fila)** — `firestore.rules` + `storage.rules`: cada expediente lleva `userId`; leer, editar, borrar o re-asignar documentos ajenos está denegado en el servidor, no solo en la UI.
- **Rate limiting** — `utils/rateLimiter.ts`: ráfaga de 5 análisis/minuto + cuota de 80/día persistida, con reintentos de backoff exponencial para errores transitorios de la API.
- **Caché** — tres niveles: (1) resultados de IA por hash SHA-256 del documento (`utils/cache.ts`, TTL 30 días, poda LRU); (2) persistencia offline de Firestore (`firebase.ts`); (3) headers HTTP `immutable` para assets (`firebase.json`).
- **Monitoreo constante** — `utils/monitoring.ts`: captura global de errores, trazas de latencia de IA/Firestore/Storage, Web Vitals, panel en vivo en Ajustes y exportación de diagnóstico JSON.

## Puesta en marcha local

```bash
# 1. Requisitos: Node.js 18+ (recomendado 20)
node -v

# 2. Instalar dependencias
npm install

# 3. Variables de entorno (la llave Gemini NUNCA se versiona)
cp .env.example .env
#    → edita .env y pega tu GEMINI_API_KEY

# 4. Servidor de desarrollo
npm run dev
```

## Provisión de Firebase (una sola vez)

1. Crea un proyecto en <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: habilita Google, Microsoft (registra la app en Azure para el Client ID), Apple y *Email link (passwordless sign-in)*.
3. **Firestore** y **Storage**: crea ambos en modo producción.
4. Copia la configuración web del proyecto en `firebase.ts` y el ID del proyecto en `.firebaserc`.
5. Despliega las reglas RLS:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

## Control de versiones

```bash
git init
git add .
git commit -m "feat: LicListo v1.0.0 — núcleo completo"
git branch -M main
git remote add origin git@github.com:TU-USUARIO/liclisto.git
git push -u origin main
```

Convención sugerida: ramas `feature/*` → Pull Request → `main`. Cada PR genera automáticamente una **vista previa efímera** en Firebase Hosting (7 días); cada merge a `main` publica a producción.

`.gitignore` ya excluye `node_modules/`, `dist/`, `.env` y cuentas de servicio: **ningún secreto entra al repositorio**.

## Hosting gratuito + Deployment automático

**Opción A — CI/CD con GitHub Actions (recomendada):**

```bash
firebase init hosting:github
# → genera el secreto FIREBASE_SERVICE_ACCOUNT en tu repo
```

Después agrega `GEMINI_API_KEY` en GitHub → *Settings → Secrets and variables → Actions*. Desde entonces, cada `git push origin main` ejecuta: typecheck → build minificado → verificación anti-source-maps → deploy.

**Opción B — Deploy manual:**

```bash
npm run deploy   # build + hosting + reglas RLS
```

El plan gratuito **Spark** de Firebase incluye hosting con CDN global y SSL, Firestore (50k lecturas/día) y Auth ilimitado — suficiente para un despacho en operación normal. Alternativas igualmente gratuitas para el front: Vercel o Netlify apuntando la carpeta `dist/`.

## Estructura

```
├── index.html / index.tsx / App.tsx     # Shell de la SPA
├── types.ts                             # Modelo relacional (contratos TS)
├── firebase.ts                          # SDK + caché offline de Firestore
├── firestore.rules / storage.rules      # RLS por usuario
├── firebase.json / .firebaserc          # Hosting + headers de caché HTTP
├── vite.config.ts                       # Build comprimido sin source maps
├── components/                          # Login, Dashboard, CaseDetail, Timeline,
│                                        # CalendarView, FileUpload, visores y modales
├── services/
│   ├── geminiService.ts                 # IA + rate limit + caché + trazas
│   └── caseService.ts                   # CRUD Firestore + Storage + fusión
├── utils/
│   ├── dateUtils.ts                     # Días hábiles (calendario judicial MX)
│   ├── rateLimiter.ts                   # Token bucket + cuota diaria
│   ├── cache.ts                         # Caché SHA-256 de análisis (LRU)
│   └── monitoring.ts                    # Errores, latencias, Web Vitals
└── .github/workflows/deploy.yml         # Pipeline CI/CD
```

## Nota de seguridad sobre la llave de Gemini

En esta arquitectura full-cliente la llave viaja en el bundle (mitigada por minificación, rate limiting local y restricciones de la llave en Google Cloud Console: limita por **HTTP referrer** a tu dominio). Para endurecerla en una fase 2, mueve la llamada a una **Cloud Function** o usa **Firebase AI Logic**, que proxea Gemini sin exponer la llave.
