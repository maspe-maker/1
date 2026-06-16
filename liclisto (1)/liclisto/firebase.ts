import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ─────────────────────────────────────────────────────────────
// Configuración pública del proyecto Firebase.
// (Estas llaves NO son secretas: la seguridad real vive en
//  firestore.rules / storage.rules — RLS por usuario.)
// Sustituye los valores con los de tu consola de Firebase.
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'TU_API_KEY_WEB',
  authDomain: 'TU-PROYECTO-FIREBASE.firebaseapp.com',
  projectId: 'TU-PROYECTO-FIREBASE',
  storageBucket: 'TU-PROYECTO-FIREBASE.firebasestorage.app',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Caché persistente: la app abre al instante con datos locales y
// sincroniza en segundo plano. Funciona incluso sin conexión.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);
