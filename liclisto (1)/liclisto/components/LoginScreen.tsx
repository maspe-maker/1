import { useEffect, useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '../firebase';
import { monitor } from '../utils/monitoring';
import { IconScale, IconMail, IconSpinner } from './Icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState('');

  const runSSO = async (provider: GoogleAuthProvider | OAuthProvider, name: string) => {
    setError('');
    try {
      await monitor.trace(`auth.${name}`, () => signInWithPopup(auth, provider) as Promise<unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    }
  };

  const triggerGoogleLogin = () => runSSO(new GoogleAuthProvider(), 'google');
  const triggerMicrosoftLogin = () => runSSO(new OAuthProvider('microsoft.com'), 'microsoft');
  const triggerAppleLogin = () => runSSO(new OAuthProvider('apple.com'), 'apple');

  const handleEmailLinkLogin = async () => {
    if (!email.includes('@')) {
      setError('Escribe un correo válido.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el enlace.');
    } finally {
      setSending(false);
    }
  };

  // Reabsorbe la sesión si el usuario llega desde un Magic Link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const stored =
        window.localStorage.getItem('emailForSignIn') ||
        window.prompt('Confirma tu correo para ingresar:');
      if (stored) {
        signInWithEmailLink(auth, stored, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
          .catch((e) => setError(e.message));
      }
    }
  }, []);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de identidad */}
      <div className="hidden lg:flex flex-col justify-between bg-tinta-900 text-papel p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 31px, #F6F4EE 31px, #F6F4EE 32px)',
          }}
          aria-hidden
        />
        <div className="flex items-center gap-3 relative">
          <IconScale className="w-8 h-8 text-ambar" strokeWidth={1.5} />
          <span className="font-display text-2xl font-semibold tracking-tight">LicListo</span>
        </div>
        <div className="relative">
          <p className="font-display text-5xl leading-[1.1] font-semibold max-w-md">
            El expediente al día.
            <br />
            <span className="text-ambar">El plazo, jamás vencido.</span>
          </p>
          <p className="mt-6 text-papel-300/80 max-w-md leading-relaxed">
            Centro de control para despachos: ingesta de acuerdos con IA, plazos fatales en días
            hábiles y aislamiento total de datos por abogado.
          </p>
        </div>
        <p className="text-xs text-papel-300/50 relative font-mono">
          ART. 17 CONSTITUCIONAL · JUSTICIA PRONTA Y EXPEDITA
        </p>
      </div>

      {/* Panel de acceso */}
      <div className="flex items-center justify-center p-6 bg-papel">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <IconScale className="w-7 h-7 text-sello" strokeWidth={1.5} />
            <span className="font-display text-2xl font-semibold">LicListo</span>
          </div>

          <h1 className="font-display text-3xl font-semibold mb-1">Bienvenido, Lic.</h1>
          <p className="text-grafito mb-8">Accede a tu despacho digital.</p>

          <div className="space-y-3">
            <button
              onClick={triggerGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-papel-300 rounded-lg px-4 py-3 font-medium hover:border-tinta-500 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continuar con Google
            </button>
            <button
              onClick={triggerMicrosoftLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-papel-300 rounded-lg px-4 py-3 font-medium hover:border-tinta-500 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23" aria-hidden>
                <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
                <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
                <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
              </svg>
              Continuar con Microsoft
            </button>
            <button
              onClick={triggerAppleLogin}
              className="w-full flex items-center justify-center gap-3 bg-tinta text-papel rounded-lg px-4 py-3 font-medium hover:bg-tinta-700 transition-colors"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continuar con Apple
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-papel-300" />
            <span className="text-xs text-grafito uppercase tracking-widest">o sin contraseña</span>
            <div className="h-px flex-1 bg-papel-300" />
          </div>

          {linkSent ? (
            <div className="bg-olivo-100 border border-olivo/30 rounded-lg p-4 text-sm">
              <p className="font-semibold text-olivo">Enlace enviado a {email}</p>
              <p className="text-grafito mt-1">
                Abre tu correo y toca el enlace para entrar directo, sin contraseña.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="email" className="sr-only">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@despacho.mx"
                className="w-full border border-papel-300 rounded-lg px-4 py-3 bg-white focus:border-tinta outline-none"
              />
              <button
                onClick={handleEmailLinkLogin}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-sello text-white rounded-lg px-4 py-3 font-medium hover:bg-sello-600 transition-colors disabled:opacity-60"
              >
                {sending ? <IconSpinner className="w-4 h-4 animate-spin" /> : <IconMail className="w-4 h-4" />}
                Enviar enlace mágico
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-sello bg-sello-100 border border-sello/20 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
