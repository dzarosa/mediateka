export interface MediatekaConfig {
  /** Publiczny adres backendu, bez końcowego ukośnika. */
  apiBaseUrl: string;
  driveFolderName: string;
  /** Opcjonalny tryb demonstracyjny bez backendu. */
  demoMode: boolean;
  /** Limit po stronie UI; backend sprawdza limit ponownie. */
  maxUploadBytes: number;
}

declare global {
  interface Window {
    MEDIATEKA_CONFIG?: Partial<MediatekaConfig>;
  }
}

const PLACEHOLDERS = ['HIER_BACKEND_URL_EINTRAGEN', 'YOUR_BACKEND_URL', 'TU_WPISZ_BACKEND'];

export function getConfig(): MediatekaConfig {
  const raw = window.MEDIATEKA_CONFIG ?? {};
  return {
    apiBaseUrl: (raw.apiBaseUrl ?? '').trim().replace(/\/$/, ''),
    driveFolderName: (raw.driveFolderName ?? 'Korea_Japonia_2026').trim() || 'Korea_Japonia_2026',
    demoMode: raw.demoMode === true,
    maxUploadBytes:
      typeof raw.maxUploadBytes === 'number' && raw.maxUploadBytes > 0
        ? raw.maxUploadBytes
        : 20 * 1024 * 1024 * 1024,
  };
}

export function isDemoMode(): boolean {
  return getConfig().demoMode;
}

export function isConfigured(): boolean {
  const { apiBaseUrl } = getConfig();
  if (!apiBaseUrl) return false;
  if (PLACEHOLDERS.some((p) => apiBaseUrl.includes(p))) return false;
  return /^https?:\/\//i.test(apiBaseUrl);
}
