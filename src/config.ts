// Liest die Runtime-Konfiguration aus public/config.js (window.MEDIATEKA_CONFIG).
// Typsicher, mit Fallbacks und Erkennung des Platzhalter-Zustands.

export interface MediatekaConfig {
  googleClientId: string;
  driveFolderName: string;
}

declare global {
  interface Window {
    MEDIATEKA_CONFIG?: Partial<MediatekaConfig>;
  }
}

const PLACEHOLDER = 'HIER_GOOGLE_CLIENT_ID_EINTRAGEN';

export function getConfig(): MediatekaConfig {
  const raw = window.MEDIATEKA_CONFIG ?? {};
  return {
    googleClientId: (raw.googleClientId ?? '').trim(),
    driveFolderName: (raw.driveFolderName ?? 'Korea_Japonia_2026').trim() || 'Korea_Japonia_2026',
  };
}

/** true, wenn eine echte Client-ID eingetragen ist (kein Platzhalter). */
export function isConfigured(): boolean {
  const { googleClientId } = getConfig();
  return (
    googleClientId.length > 0 &&
    !googleClientId.includes(PLACEHOLDER) &&
    googleClientId.endsWith('.apps.googleusercontent.com')
  );
}
