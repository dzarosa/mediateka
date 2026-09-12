// Liest die Runtime-Konfiguration aus public/config.js (window.MEDIATEKA_CONFIG).
// Typsicher, mit Fallbacks und Erkennung des Platzhalter-Zustands.

export interface MediatekaConfig {
  googleClientId: string;
  driveFolderName: string;
  /** Nur für Vorschau/Demo auf true setzen (kein Google-Login, keine Drive-API). */
  demoMode: boolean;
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
    demoMode: raw.demoMode === true,
  };
}

/**
 * true, wenn der Demo-Modus aktiv ist.
 * Demo = automatischer Fallback, sobald KEINE echte Google Client ID eingetragen
 * ist (Platzhalter in public/config.js) — die App läuft dann komplett ohne
 * Google-Login mit Beispielbildern aus public/. Das Flag `demoMode: true` in
 * config.js erzwingt den Demo-Modus zusätzlich auch bei eingetragener Client-ID.
 */
export function isDemoMode(): boolean {
  return getConfig().demoMode || !isConfigured();
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
