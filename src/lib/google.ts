// ============================================================================
// Google Identity Services (GIS) — Token-Client für die Drive API
// ----------------------------------------------------------------------------
// - Das GIS-Script wird dynamisch geladen (https://accounts.google.com/gsi/client)
// - Access-Token lebt NUR im Speicher (kein localStorage!)
// - Ein Session-Flag in sessionStorage erlaubt Silent-Refresh nach Reload
//   via requestAccessToken({ prompt: '' })
// ============================================================================

import { getConfig } from '@/config';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPES =
  'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';
const GSI_FLAG = 'mediateka.gsi';

// --- Minimale Typdefinitionen für google.accounts.oauth2 -------------------
interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GoogleOauth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { type: string; message?: string }) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOauth2 } };
  }
}

let gisPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let pendingResolver: ((token: string | null) => void) | null = null;

/** Lädt das GIS-Script genau einmal. */
export function ensureGisLoaded(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Nie udało się załadować Google Identity Services.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

function getTokenClient(): TokenClient {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Google Identity Services nie jest załadowane.');
  if (!tokenClient) {
    tokenClient = oauth2.initTokenClient({
      client_id: getConfig().googleClientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.access_token) {
          accessToken = resp.access_token;
          sessionStorage.setItem(GSI_FLAG, '1');
          pendingResolver?.(accessToken);
        } else {
          pendingResolver?.(null);
        }
        pendingResolver = null;
      },
      error_callback: () => {
        pendingResolver?.(null);
        pendingResolver = null;
      },
    });
  }
  return tokenClient;
}

function request(prompt: '' | 'consent'): Promise<string | null> {
  return new Promise((resolve) => {
    pendingResolver = resolve;
    try {
      getTokenClient().requestAccessToken({ prompt });
    } catch {
      pendingResolver = null;
      resolve(null);
    }
  });
}

/** Interaktiver Login (Button-Klick) — zeigt ggf. den Google-Consent. */
export async function signInWithGoogle(): Promise<string | null> {
  await ensureGisLoaded();
  return request('consent');
}

/**
 * Silent-Refresh nach Reload: nur wenn zuvor eingeloggt (Session-Flag).
 * prompt: '' → kein Popup, wenn die Session bei Google noch gilt.
 */
export async function silentRefresh(): Promise<string | null> {
  if (sessionStorage.getItem(GSI_FLAG) !== '1') return null;
  try {
    await ensureGisLoaded();
    return await request('');
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Token verwerfen + bei Google widerrufen; Session-Flag löschen. */
export function signOutGoogle(): void {
  const token = accessToken;
  accessToken = null;
  sessionStorage.removeItem(GSI_FLAG);
  const oauth2 = window.google?.accounts?.oauth2;
  if (token && oauth2) {
    try {
      oauth2.revoke(token, () => undefined);
    } catch {
      // Revoke ist best-effort
    }
  }
}

/** Bei 401 von Drive: Token invalidieren, damit neu eingeloggt wird. */
export function invalidateToken(): void {
  accessToken = null;
  sessionStorage.removeItem(GSI_FLAG);
}
