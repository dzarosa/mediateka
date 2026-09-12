// ============================================================================
// Zentraler App-State: Gruppensperre + Google-Login + Drive-Medienliste
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  clearSession,
  getSession,
  saveSession,
  type GateUser,
} from '@/lib/gate';
import {
  getAccessToken,
  invalidateToken,
  signInWithGoogle,
  signOutGoogle,
  silentRefresh,
} from '@/lib/google';
import {
  clearBlobCache,
  deleteFile,
  DriveError,
  findFolder,
  listMedia,
  setDriveToken,
  type DriveMedia,
} from '@/lib/drive';
import { getConfig, isConfigured } from '@/config';

export type GoogleStatus = 'idle' | 'signing-in' | 'ready' | 'error';

export interface ToastMsg {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}

interface AppContextValue {
  configured: boolean;
  gateUser: GateUser | null;
  googleStatus: GoogleStatus;
  googleError: string | null;
  folderId: string | null;
  media: DriveMedia[] | null;
  mediaLoading: boolean;
  mediaError: string | null;
  toasts: ToastMsg[];
  gateLoginDone: (user: GateUser) => void;
  signInGoogle: () => Promise<boolean>;
  logout: () => void;
  refreshMedia: () => Promise<void>;
  removeMedia: (id: string) => Promise<boolean>;
  toast: (text: string, kind?: ToastMsg['kind']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

let toastId = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const [gateUser, setGateUser] = useState<GateUser | null>(() => getSession());
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>('idle');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [media, setMedia] = useState<DriveMedia[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const folderIdRef = useRef<string | null>(null);

  const toast = useCallback((text: string, kind: ToastMsg['kind'] = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const gateLoginDone = useCallback((user: GateUser) => {
    saveSession(user);
    setGateUser(user);
  }, []);

  const refreshMedia = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setMediaLoading(true);
    setMediaError(null);
    setDriveToken(token);
    try {
      let fid = folderIdRef.current;
      if (!fid) {
        fid = await findFolder(token, getConfig().driveFolderName);
        folderIdRef.current = fid;
        setFolderId(fid);
      }
      const items = await listMedia(token, fid);
      setMedia(items);
    } catch (err) {
      if (err instanceof DriveError && err.status === 401) {
        invalidateToken();
        setDriveToken(null);
        setGoogleStatus('idle');
        setMedia(null);
        folderIdRef.current = null;
        setFolderId(null);
      }
      setMediaError(err instanceof DriveError ? err.friendly : 'Nieznany błąd połączenia z Drive.');
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const afterToken = useCallback(async () => {
    setGoogleStatus('ready');
    setDriveToken(getAccessToken());
    await refreshMedia();
  }, [refreshMedia]);

  const signInGoogle = useCallback(async (): Promise<boolean> => {
    setGoogleStatus('signing-in');
    setGoogleError(null);
    try {
      const token = await signInWithGoogle();
      if (!token) {
        setGoogleStatus('idle');
        setGoogleError('Logowanie Google zostało anulowane lub nie powiodło się.');
        return false;
      }
      await afterToken();
      return true;
    } catch {
      setGoogleStatus('error');
      setGoogleError('Nie udało się połączyć z Google. Sprawdź internet i spróbuj ponownie.');
      return false;
    }
  }, [afterToken]);

  // Silent-Refresh nach Reload, wenn die Gruppensperre noch aktiv ist.
  useEffect(() => {
    if (!gateUser || !isConfigured()) return;
    if (getAccessToken()) return;
    let cancelled = false;
    void silentRefresh().then((token) => {
      if (!cancelled && token) void afterToken();
    });
    return () => {
      cancelled = true;
    };
  }, [gateUser, afterToken]);

  const logout = useCallback(() => {
    signOutGoogle();
    clearSession();
    clearBlobCache();
    setDriveToken(null);
    setGateUser(null);
    setGoogleStatus('idle');
    setMedia(null);
    setFolderId(null);
    folderIdRef.current = null;
  }, []);

  const removeMedia = useCallback(
    async (id: string): Promise<boolean> => {
      const token = getAccessToken();
      if (!token) return false;
      try {
        await deleteFile(token, id);
        setMedia((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
        toast('Usunięto plik 🗑️', 'success');
        return true;
      } catch (err) {
        toast(err instanceof DriveError ? err.friendly : 'Nie udało się usunąć pliku.', 'error');
        return false;
      }
    },
    [toast],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      configured: isConfigured(),
      gateUser,
      googleStatus,
      googleError,
      folderId,
      media,
      mediaLoading,
      mediaError,
      toasts,
      gateLoginDone,
      signInGoogle,
      logout,
      refreshMedia,
      removeMedia,
      toast,
    }),
    [
      gateUser,
      googleStatus,
      googleError,
      folderId,
      media,
      mediaLoading,
      mediaError,
      toasts,
      gateLoginDone,
      signInGoogle,
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
  if (!ctx) throw new Error('useApp muss innerhalb von AppProvider verwendet werden.');
  return ctx;
}
