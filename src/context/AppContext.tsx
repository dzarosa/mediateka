import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { clearSession, getSession, saveSession, USERS, type GateUser } from '@/lib/gate';
import { loginApi, ApiError } from '@/lib/api';
import { clearBlobCache, deleteFile, DriveError, listMedia, type DriveMedia } from '@/lib/drive';
import { isConfigured, isDemoMode } from '@/config';

export type SessionStatus = 'idle' | 'signing-in' | 'ready' | 'error';

export interface ToastMsg {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}

interface AppContextValue {
  configured: boolean;
  demoMode: boolean;
  gateUser: GateUser | null;
  sessionStatus: SessionStatus;
  loginError: string | null;
  folderId: string | null;
  media: DriveMedia[] | null;
  mediaLoading: boolean;
  mediaError: string | null;
  toasts: ToastMsg[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshMedia: (force?: boolean) => Promise<void>;
  removeMedia: (id: string) => Promise<boolean>;
  toast: (text: string, kind?: ToastMsg['kind']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
let toastId = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => getSession(), []);
  const [gateUser, setGateUser] = useState<GateUser | null>(initial?.user ?? null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(initial ? 'ready' : 'idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [media, setMedia] = useState<DriveMedia[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const toast = useCallback((text: string, kind: ToastMsg['kind'] = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    clearBlobCache();
    setGateUser(null);
    setSessionStatus('idle');
    setLoginError(null);
    setMedia(null);
    setFolderId(null);
    setMediaError(null);
  }, []);

  const refreshMedia = useCallback(async (force = false) => {
    if (!gateUser) return;

    // Po uploadzie potrzebujemy NOWEJ listy z Drive. Jeżeli właśnie trwa starsze
    // odświeżanie (np. rozpoczęte przy wejściu do galerii), poczekaj na nie i
    // wykonaj jeszcze jedno żądanie zamiast zwracać potencjalnie nieaktualny wynik.
    if (refreshInFlight.current) {
      if (!force) return refreshInFlight.current;
      try {
        await refreshInFlight.current;
      } catch {
        // Poniżej i tak wykonamy świeżą próbę.
      }
    }

    const run = (async () => {
      setMediaLoading(true);
      setMediaError(null);
      try {
        const result = await listMedia();
        setFolderId(result.folderId);
        setMedia(result.items);
        setSessionStatus('ready');
      } catch (err) {
        if ((err instanceof DriveError || err instanceof ApiError) && err.status === 401) {
          logout();
          return;
        }
        setMediaError(
          err instanceof DriveError || err instanceof ApiError
            ? err.friendly
            : 'Nieznany błąd połączenia z Mediateką.',
        );
      } finally {
        setMediaLoading(false);
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
  }, [gateUser, logout]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setSessionStatus('signing-in');
    setLoginError(null);
    try {
      if (isDemoMode()) {
        const user = USERS.find((u) => u.username === username);
        if (!user || !password) throw new ApiError('demo-login', 'Wybierz użytkownika i wpisz hasło.', 401);
        saveSession({ user, token: 'demo' });
        setGateUser(user);
        setSessionStatus('ready');
        return true;
      }

      const session = await loginApi(username, password);
      saveSession(session);
      setGateUser(session.user);
      setSessionStatus('ready');
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.friendly : 'Nie udało się zalogować do Mediateki.';
      setLoginError(message);
      setSessionStatus('error');
      return false;
    }
  }, []);

  useEffect(() => {
    if (gateUser && !media && !mediaLoading && !mediaError) void refreshMedia();
  }, [gateUser, media, mediaLoading, mediaError, refreshMedia]);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener('mediateka:session-expired', onExpired);
    return () => window.removeEventListener('mediateka:session-expired', onExpired);
  }, [logout]);

  const removeMedia = useCallback(
    async (id: string): Promise<boolean> => {
      if (isDemoMode()) {
        toast('Tryb demo: usuwanie plików jest wyłączone.', 'info');
        return false;
      }
      try {
        await deleteFile(id);
        setMedia((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
        toast('Usunięto plik 🗑️', 'success');
        return true;
      } catch (err) {
        if ((err instanceof DriveError || err instanceof ApiError) && err.status === 401) logout();
        toast(
          err instanceof DriveError || err instanceof ApiError ? err.friendly : 'Nie udało się usunąć pliku.',
          'error',
        );
        return false;
      }
    },
    [logout, toast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      configured: isConfigured() || isDemoMode(),
      demoMode: isDemoMode(),
      gateUser,
      sessionStatus,
      loginError,
      folderId,
      media,
      mediaLoading,
      mediaError,
      toasts,
      login,
      logout,
      refreshMedia,
      removeMedia,
      toast,
    }),
    [
      gateUser,
      sessionStatus,
      loginError,
      folderId,
      media,
      mediaLoading,
      mediaError,
      toasts,
      login,
      logout,
      refreshMedia,
      removeMedia,
      toast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp musi być użyte wewnątrz AppProvider.');
  return ctx;
}
