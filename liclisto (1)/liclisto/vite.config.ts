import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────
// LicListo · Configuración de build de producción
//  - sourcemap: false  → no se publican source maps (código no inspeccionable)
//  - minify: esbuild   → compresión agresiva de JS/CSS
//  - drop console      → elimina console.* y debugger del bundle final
//  - manualChunks      → separa vendors pesados para mejor caché HTTP
// ─────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY ?? ''),
  },
  esbuild:
    mode === 'production'
      ? { drop: ['console', 'debugger'], legalComments: 'none' }
      : undefined,
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          'vendor-ai': ['@google/genai'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
}));
