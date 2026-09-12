// ============================================================================
// Weiche Gruppensperre (client-seitig)
// ----------------------------------------------------------------------------
// ⚠️ EHRLICHER HINWEIS / UWAGA:
// Das ist KEINE echte Sicherheit! Die Passwörter liegen im ausgelieferten
// JavaScript und sind für jeden sichtbar, der den Quelltext ansieht.
// Diese Sperre ist nur ein freundlicher "Türrahmen" für die Reisegruppe.
// Die ECHTE Zugriffskontrolle passiert über:
//   1. das persönliche Google-Konto (OAuth-Login) und
//   2. die Freigabe des Drive-Ordners "Korea_Japonia_2026" (nur die 9 Konten).
// ============================================================================

export interface GateUser {
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export const GROUP_PASSWORD = 'Korajapan2026!!';
export const ADMIN_PASSWORD = 'BaC2026!!';

const SESSION_KEY = 'mediateka.session';

interface UserDef {
  username: string;
  displayName: string;
  isAdmin: boolean;
}

export const USERS: UserDef[] = [
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

/** Prüft Name + Passwort. Gibt den GateUser zurück oder null. */
export function gateLogin(username: string, password: string): GateUser | null {
  const user = USERS.find((u) => u.username === username);
  if (!user) return null;
  const ok = user.isAdmin ? password === ADMIN_PASSWORD : password === GROUP_PASSWORD;
  return ok ? { ...user } : null;
}

export function getSession(): GateUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GateUser;
    if (!USERS.some((u) => u.username === parsed.username)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(user: GateUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Avatar-Asset-Pfad (prozedural generiert, liegt in public/). */
export function avatarUrl(username: string): string {
  return `${import.meta.env.BASE_URL}avatar-${username}.png`;
}
