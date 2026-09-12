import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { gateLogin, USERS } from '@/lib/gate';
import { useApp } from '@/context/AppContext';
import Seal from '@/components/Seal';
import GrainOverlay from '@/components/GrainOverlay';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

/**
 * Login: Schritt 1 = weiche Gruppensperre (Chips + Passwort) — IMMER verfügbar,
 * unabhängig von der Google-Konfiguration.
 * Schritt 2 = Google-Login (nur wenn eine Client-ID konfiguriert ist).
 * Ohne Client-ID → automatischer Demo-Modus (Beispielbilder, kein Google-Schritt).
 */
export default function Login() {
  const {
    gateUser,
    gateLoginDone,
    signInGoogle,
    enterDemo,
    googleStatus,
    googleError,
    demoMode,
  } = useApp();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const alreadyIn = gateUser && googleStatus === 'ready';

  useEffect(() => {
    if (googleStatus === 'ready') navigate('/', { replace: true });
  }, [googleStatus, navigate]);

  // Demo-Modus (keine Google Client ID): Google-Schritt komplett überspringen —
  // direkt nach der Gruppensperre automatisch in den Demo-Modus wechseln.
  useEffect(() => {
    if (gateUser && demoMode && googleStatus === 'idle') void enterDemo();
  }, [gateUser, demoMode, googleStatus, enterDemo]);

  if (alreadyIn) return <Navigate to="/" replace />;

  const submitGate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selected || !password) {
      setError('Wybierz swoje imię i wpisz hasło.');
      triggerShake();
      return;
    }
    setChecking(true);
    // kleine künstliche Verzögerung für das Gefühl einer Prüfung
    window.setTimeout(() => {
      const user = gateLogin(selected, password);
      setChecking(false);
      if (!user) {
        setFails((f) => f + 1);
        setError('Nieprawidłowy login lub hasło — spróbuj jeszcze raz.');
        triggerShake();
        return;
      }
      gateLoginDone(user);
    }, 350);
  };

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#0B0B12]">
      <GrainOverlay />
      {/* Mobile: Vollbild-Hintergrund */}
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: `url(${BASE}login-hero.jpg)` }}
      />
      <div className="absolute inset-0 bg-black/65 md:hidden" style={{ backgroundColor: 'rgba(11,11,18,0.72)' }} />

      {/* Links: Formular */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-10 md:w-[45%]">
        {/* Brand */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex flex-col items-center text-center"
        >
          <Seal
            size={64}
            className="animate-seal-rotate drop-shadow-[0_0_28px_rgba(255,92,122,0.5)]"
          />
          <motion.h1
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="font-display mt-4 text-[28px] font-extrabold uppercase tracking-[0.12em]"
          >
            Mediateka
          </motion.h1>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-hand -rotate-2 text-2xl text-[#FF5C7A]"
          >
            Seul → Tokio · sierpień–wrzesień 2026 ♡
          </motion.p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Wspólna galeria naszej grupy — zaloguj się, żeby dodawać zdjęcia i filmy.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!gateUser ? (
            /* -------- Schritt 1: Gruppensperre -------- */
            <motion.form
              key="gate"
              onSubmit={submitGate}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className={cn(
                'glass mt-8 w-full max-w-[400px] rounded-2xl p-8 shadow-[0_24px_80px_rgba(139,92,246,0.18)]',
                shake && 'animate-shake',
              )}
            >
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Krok 1 · Kim jesteś?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {USERS.map((u) => (
                  <motion.button
                    key={u.username}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setSelected(u.username);
                      setError(null);
                    }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition',
                      selected === u.username
                        ? 'btn-gradient font-semibold text-[#0B0B12]'
                        : 'glass text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {u.displayName}
                  </motion.button>
                ))}
              </div>

              <label className="mt-6 block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Hasło grupowe
              </label>
              <div className="relative mt-2">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className={cn(
                    'w-full rounded-xl border bg-white/5 py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-[#A78BFA]',
                    error ? 'border-[#F87171]' : 'border-white/15',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Pokaż hasło"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-[#FF5C7A]">{error}</p>}
              {fails >= 3 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Podpowiedź: hasło ma format <code className="text-[#5EEAD4]">Korajapan2026!!</code>{' '}
                  (admin ma własne).
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={checking}
                className="btn-gradient font-display mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[15px] font-bold text-[#0B0B12] disabled:opacity-60"
              >
                {checking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sprawdzam…
                  </>
                ) : (
                  'Zaloguj się'
                )}
              </motion.button>
              <p className="font-hand mt-4 text-center text-lg text-muted-foreground">
                Hasło grupowe dostaniecie na czacie wyjazdu ✈️
              </p>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                To tylko miękka blokada po stronie przeglądarki — prawdziwą ochronę daje konto
                Google i udostępniony folder.
              </p>
            </motion.form>
          ) : (
            /* -------- Schritt 2: Google -------- */
            <motion.div
              key="google"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="glass mt-8 w-full max-w-[400px] rounded-2xl p-8 text-center shadow-[0_24px_80px_rgba(139,92,246,0.18)]"
            >
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Krok 2 · Połącz z Google
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Cześć, <span className="text-gradient font-semibold">{gateUser.displayName}</span>!
                Teraz zaloguj się swoim <strong>kontem Google</strong>, które ma dostęp do folderu{' '}
                <code className="rounded bg-white/10 px-1 text-[#5EEAD4]">Korea_Japonia_2026</code>.
                Dzięki temu zdjęcia trafią prosto na wspólny Dysk Google.
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => void signInGoogle()}
                disabled={googleStatus === 'signing-in'}
                className="btn-gradient font-display mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[15px] font-bold text-[#0B0B12] disabled:opacity-60"
              >
                {googleStatus === 'signing-in' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Łączenie…
                  </>
                ) : (
                  'Zaloguj przez Google'
                )}
              </motion.button>
              {googleError && <p className="mt-3 text-sm text-[#FF5C7A]">{googleError}</p>}
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/70">
                Przy pierwszym logowaniu Google może pokazać ostrzeżenie „Aplikacja niezweryfikowana"
                → kliknij <em>Zaawansowane</em> → <em>Przejdź dalej</em>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rechts: Hero-Collage (Desktop) */}
      <div className="relative hidden flex-1 md:block">
        <div
          className="animate-kenburns absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BASE}login-hero.jpg)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #0B0B12 0%, rgba(11,11,18,0.4) 25%, transparent 60%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute right-8 top-8 text-right"
        >
          <p className="font-hand text-2xl text-white/90 drop-shadow">Seul → Tokio, sierpień–wrzesień 2026</p>
          <svg width="120" height="40" viewBox="0 0 120 40" className="ml-auto mt-1 text-[#FF5C7A]">
            <motion.path
              d="M110 4 C 70 30, 40 6, 10 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1, duration: 1.2 }}
            />
            <path d="M10 30 l10 -2 l-4 8 z" fill="currentColor" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
