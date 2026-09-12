/**
 * Warstwa zgodności ze starszą wersją Mediateki.
 *
 * OAuth Google nie jest już wykonywany w przeglądarce. Google Drive jest
 * obsługiwany przez backend, więc funkcje poniżej pozostają wyłącznie po to,
 * aby stare importy w repozytorium nie psuły kompilacji podczas migracji.
 */
export async function ensureGisLoaded(): Promise<void> {
  return Promise.resolve();
}

export async function signInWithGoogle(): Promise<string | null> {
  return null;
}

export async function silentRefresh(): Promise<string | null> {
  return null;
}

export function getAccessToken(): string | null {
  return null;
}

export function signOutGoogle(): void {
  // OAuth użytkownika został usunięty — brak tokenu po stronie klienta.
}

export function invalidateToken(): void {
  // OAuth użytkownika został usunięty — brak tokenu po stronie klienta.
}
