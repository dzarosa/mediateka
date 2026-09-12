// ============================================================================
// Google Drive API v3 — alles per fetch/XHR, komplett im Browser.
// ----------------------------------------------------------------------------
// - findFolder(): Ordner "Korea_Japonia_2026" anhand des Namens finden
// - listMedia(): Fotos & Videos im Ordner auflisten
// - Thumbnails/Vollbild: fetch mit Authorization-Header → Blob → Object-URL
// - uploadToDrive(): multipart/related XHR mit echtem Fortschritt
// - deleteFile(): nur für Admin im UI
// ============================================================================

import { isDemoMode } from '@/config';
import { USERS } from '@/lib/gate';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export type MediaType = 'photo' | 'video';

export interface DriveMedia {
  id: string;
  name: string;
  mimeType: string;
  type: MediaType;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  size?: number;
  createdTime?: string;
  uploader?: string;
  durationMs?: number;
  width?: number;
  height?: number;
}

/** Fehler mit laienverständlicher Meldung (polnisch + deutsch). */
export class DriveError extends Error {
  readonly status?: number;
  readonly friendly: string;

  constructor(message: string, friendly: string, status?: number) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
    this.friendly = friendly;
  }
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function driveFetch<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    throw new DriveError(
      '401 Unauthorized',
      'Sesja Google wygasła — zaloguj się jeszcze raz. / Google-Sitzung abgelaufen, bitte neu anmelden.',
      401,
    );
  }
  if (res.status === 403) {
    throw new DriveError(
      '403 Forbidden',
      'Brak dostępu do Google Drive. Upewnij się, że folder jest udostępniony Twojemu kontu Google. / Kein Zugriff — Ordner-Freigabe prüfen.',
      403,
    );
  }
  if (!res.ok) {
    throw new DriveError(
      `Drive API ${res.status}`,
      `Błąd Google Drive (${res.status}). Spróbuj ponownie za chwilę. / Drive-Fehler, bitte später erneut versuchen.`,
      res.status,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface RawFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
  appProperties?: Record<string, string>;
  videoMediaMetadata?: { durationMillis?: string; width?: number; height?: number };
  imageMediaMetadata?: { width?: number; height?: number };
}

function mapFile(f: RawFile): DriveMedia | null {
  const isImage = f.mimeType.startsWith('image/');
  const isVideo = f.mimeType.startsWith('video/');
  if (!isImage && !isVideo) return null;
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    type: isVideo ? 'video' : 'photo',
    thumbnailLink: f.thumbnailLink,
    webContentLink: f.webContentLink,
    webViewLink: f.webViewLink,
    size: f.size ? Number(f.size) : undefined,
    createdTime: f.createdTime,
    uploader: f.appProperties?.uploader,
    durationMs: f.videoMediaMetadata?.durationMillis
      ? Number(f.videoMediaMetadata.durationMillis)
      : undefined,
    width: f.imageMediaMetadata?.width ?? f.videoMediaMetadata?.width,
    height: f.imageMediaMetadata?.height ?? f.videoMediaMetadata?.height,
  };
}

// --- Demo-Modus ---------------------------------------------------------------
// Aktiv, wenn keine echte Google Client ID konfiguriert ist (automatischer
// Fallback) oder public/config.js → demoMode: true gesetzt ist.
// Liefert statische Beispielbilder aus public/ — KEIN Zugriff auf Google Drive,
// keine Blob-Fetches (die Dateien werden direkt relativ eingebunden).

/** Statische Demo-Dateien in public/ (kein echtes mp4 vorhanden → nur Fotos). */
const DEMO_FILES = [
  'demo-01.jpg',
  'demo-02.jpg',
  'demo-03.jpg',
  'demo-04.jpg',
  'demo-05.jpg',
  'demo-06.jpg',
  'demo-07.jpg',
  'demo-08.jpg',
  'demo-09.jpg',
  'demo-10.jpg',
];

/** Baut Demo-Media-Objekte: Uploader rotiert über die 9 Benutzer,
 *  createdTime gestaffelt über die letzten ~10 Tage (neueste zuerst). */
function buildDemoMedia(): DriveMedia[] {
  const base = import.meta.env.BASE_URL;
  const now = Date.now();
  return DEMO_FILES.map((file, i) => ({
    id: `demo-${String(i + 1).padStart(2, '0')}`,
    name: file,
    mimeType: 'image/jpeg',
    type: 'photo',
    thumbnailLink: `${base}${file}`,
    webContentLink: `${base}${file}`,
    createdTime: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
    uploader: USERS[i % USERS.length].username,
  }));
}

/** Findet den geteilten Ordner anhand des Namens. */
export async function findFolder(token: string, folderName: string): Promise<string> {
  if (isDemoMode()) return 'demo';
  const q = encodeURIComponent(
    `name='${escapeQueryValue(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const data = await driveFetch<{ files?: { id: string }[] }>(
    token,
    `${API}/files?q=${q}&fields=files(id,name)&pageSize=10`,
  );
  const folder = data.files?.[0];
  if (!folder) {
    throw new DriveError(
      'Folder not found',
      `Nie znaleziono folderu „${folderName}" na Dysku Google. Poproś admina: Ordner anlegen & für alle 9 Konten freigeben (Bearbeiter). Szczegóły: GITHUB-SETUP.md, krok 5.`,
    );
  }
  return folder.id;
}

const LIST_FIELDS =
  'files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,size,createdTime,appProperties,videoMediaMetadata,imageMediaMetadata)';

/** Listet Fotos & Videos im Ordner (neueste zuerst, max. 200/Seite). */
export async function listMedia(token: string, folderId: string): Promise<DriveMedia[]> {
  if (isDemoMode()) return buildDemoMedia();
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const out: DriveMedia[] = [];
  let pageToken: string | undefined;
  do {
    const pt = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const data = await driveFetch<{ files?: RawFile[]; nextPageToken?: string }>(
      token,
      `${API}/files?q=${q}&fields=${encodeURIComponent(`${LIST_FIELDS},nextPageToken`)}&orderBy=${encodeURIComponent('createdTime desc')}&pageSize=200${pt}`,
    );
    for (const f of data.files ?? []) {
      const m = mapFile(f);
      if (m) out.push(m);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

// --- Blob-URL-Cache ---------------------------------------------------------

const blobCache = new Map<string, string>();

/** Holt eine Datei (Thumbnail oder Vollbild) als Blob-URL, mit Cache. */
export async function fetchBlobUrl(token: string, url: string, cacheKey: string): Promise<string> {
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new DriveError(
      `Media fetch ${res.status}`,
      'Nie udało się pobrać pliku z Dysku Google. / Datei konnte nicht geladen werden.',
      res.status,
    );
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  blobCache.set(cacheKey, objectUrl);
  return objectUrl;
}

export function thumbUrl(media: DriveMedia): Promise<string> {
  const link = media.thumbnailLink ?? media.webContentLink;
  if (!link) return Promise.reject(new DriveError('no-thumb', 'Brak miniaturki.'));
  // Demo-Modus: statische Datei direkt einbinden (kein Blob-Fetch).
  if (isDemoMode()) return Promise.resolve(link);
  return fetchBlobUrl(getTokenOrThrow(), link, `${media.id}:thumb`);
}

export function fullUrl(media: DriveMedia): Promise<string> {
  const link = media.webContentLink ?? media.thumbnailLink;
  if (!link) return Promise.reject(new DriveError('no-full', 'Brak pliku.'));
  // Demo-Modus: statische Datei direkt einbinden (kein Blob-Fetch).
  if (isDemoMode()) return Promise.resolve(link);
  return fetchBlobUrl(getTokenOrThrow(), link, `${media.id}:full`);
}

let currentToken: string | null = null;
export function setDriveToken(token: string | null): void {
  currentToken = token;
}
function getTokenOrThrow(): string {
  if (!currentToken) throw new DriveError('no-token', 'Brak tokena Google — zaloguj się ponownie.');
  return currentToken;
}

/** Räumt alle Blob-URLs auf (z. B. bei Logout/Unmount der Galerie). */
export function clearBlobCache(): void {
  for (const url of blobCache.values()) URL.revokeObjectURL(url);
  blobCache.clear();
}

// --- Upload ------------------------------------------------------------------

export interface UploadedFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

/**
 * Multipart-Upload (multipart/related) mit echtem Fortschritt via XHR.
 * Metadata-Part enthält appProperties.uploader.
 */
export function uploadToDrive(
  token: string,
  folderId: string,
  file: File,
  uploaderName: string,
  onProgress: (fraction: number) => void,
): Promise<UploadedFile> {
  if (isDemoMode()) {
    return Promise.reject(
      new DriveError('demo', 'Tryb demo: wysyłanie na Google Drive jest wyłączone.'),
    );
  }
  return new Promise((resolve, reject) => {
    const metadata = {
      name: file.name,
      parents: [folderId],
      appProperties: { uploader: uploaderName },
    };
    const boundary = `mediateka_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const body = new FormData();
    body.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }),
    );
    body.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${UPLOAD_API}/files?uploadType=multipart&fields=${encodeURIComponent('id,name,thumbnailLink,webContentLink')}`,
    );
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // FormData setzt den multipart-Boundary-Header selbst; wir erzwingen
    // multipart/related nicht manuell, damit der Boundary konsistent bleibt.
    void boundary;

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) onProgress(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        try {
          resolve(JSON.parse(xhr.responseText) as UploadedFile);
        } catch {
          reject(new DriveError('parse', 'Upload ok, aber Antwort unlesbar.'));
        }
      } else if (xhr.status === 401) {
        reject(
          new DriveError(
            '401',
            'Sesja Google wygasła w trakcie wysyłania — zaloguj się ponownie.',
            401,
          ),
        );
      } else if (xhr.status === 403) {
        reject(
          new DriveError(
            '403',
            'Brak uprawnień do zapisu w folderze Drive. Poproś admina o dostęp „Bearbeiter/Edytor".',
            403,
          ),
        );
      } else {
        reject(
          new DriveError(
            `upload ${xhr.status}`,
            `Nie udało się wysłać pliku (błąd ${xhr.status}). Spróbuj ponownie.`,
            xhr.status,
          ),
        );
      }
    };
    xhr.onerror = () =>
      reject(new DriveError('network', 'Błąd sieci podczas wysyłania. Sprawdź połączenie.'));
    xhr.send(body);
  });
}

/** Löscht eine Datei (nur Admin im UI). */
export async function deleteFile(token: string, id: string): Promise<void> {
  if (isDemoMode()) {
    throw new DriveError('demo', 'Tryb demo: usuwanie plików jest wyłączone.');
  }
  await driveFetch<undefined>(token, `${API}/files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  // Cache-Einträge der Datei entfernen
  for (const key of [`${id}:thumb`, `${id}:full`]) {
    const url = blobCache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      blobCache.delete(key);
    }
  }
}
