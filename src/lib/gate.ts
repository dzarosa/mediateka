// ============================================================================
// Konta Mediateki
// ----------------------------------------------------------------------------
// Hasła NIE znajdują się już w frontendzie. Są sprawdzane przez backend.
// localStorage przechowuje token sesji zwrócony przez API, aby użytkownik
// nie musiał logować się ponownie po zamknięciu przeglądarki.
// ============================================================================

export interface GateUser {
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export interface GateSession {
  user: GateUser;
  token: string;
}

export const USERS: GateUser[] = [
  { username: 'kasia', displayName: 'Kasia', isAdmin: false },
  { username: 'bogusia', displayName: 'Bogusia', isAdmin: false },
  { username: 'ania_p', displayName: 'Ania', isAdmin: false },
  { username: 'rober_p', displayName: 'Robert', isAdmin: false },
  { username: 'hubert_p', displayName: 'Hubert', isAdmin: false },
  { username: 'maria', displayName: 'Maria', isAdmin: false },
  { username: 'staszek', displayName: 'Staszek', isAdmin: false },
  { username: 'klaudia', displayName: 'Klaudia', isAdmin: false },
  { username: 'admin', displayName: 'Admin', isAdmin: true },
];

const SESSION_KEY = 'mediateka.backend-session';

export function getSession(): GateSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GateSession;
    if (!parsed?.token || !parsed?.user?.username) return null;
    const known = USERS.find((u) => u.username === parsed.user.username);
    if (!known) return null;
    return { user: { ...known }, token: parsed.token };
  } catch {
    return null;
  }
}

export function saveSession(session: GateSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSessionToken(): string | null {
  return getSession()?.token ?? null;
}

export function avatarUrl(username: string): string {
  return `${import.meta.env.BASE_URL}avatar-${username}.png`;
}
