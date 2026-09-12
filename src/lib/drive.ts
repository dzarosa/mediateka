// ============================================================================
// Mediateka backend client
// ----------------------------------------------------------------------------
// Przeglądarka NIE otrzymuje tokenu OAuth Google. Backend tworzy prywatne,
// krótkotrwałe linki do odczytu oraz sesje resumable upload. Duże pliki są
// wysyłane bezpośrednio do Google Drive w kawałkach po 8 MiB.
// ============================================================================

import { getConfig, isDemoMode } from '@/config';
import { apiFetch, ApiError } from '@/lib/api';
import { USERS } from '@/lib/gate';

export type MediaType = 'photo' | 'video';

export interface DriveMedia {
  id: string;
  name: string;
  mimeType: string;
  type: MediaType;
  thumbnailLink?: string;
  webContentLink?: string;
  downloadLink?: string;
  webViewLink?: string;
  size?: number;
  createdTime?: string;
  uploader?: string;
  durationMs?: number;
  width?: number;
  height?: number;
}

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

const DEMO_FILES = [
  'demo-01.jpg', 'demo-02.jpg', 'demo-03.jpg', 'demo-04.jpg', 'demo-05.jpg',
  'demo-06.jpg', 'demo-07.jpg', 'demo-08.jpg', 'demo-09.jpg', 'demo-10.jpg',
];

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
    downloadLink: `${base}${file}`,
    createdTime: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
    uploader: USERS[i % USERS.length].username,
  }));
}

function wrapApiError(err: unknown, fallback: string): DriveError {
  if (err instanceof DriveError) return err;
  if (err instanceof ApiError) return new DriveError(err.message, err.friendly, err.status);
  return new DriveError('backend', fallback);
}

export interface MediaListResult {
  folderId: string;
  folderName: string;
  items: DriveMedia[];
}

export async function listMedia(): Promise<MediaListResult> {
  if (isDemoMode()) {
    return { folderId: 'demo', folderName: getConfig().driveFolderName, items: buildDemoMedia() };
  }
  try {
    return await apiFetch<MediaListResult>('/api/media');
  } catch (err) {
    throw wrapApiError(err, 'Nie udało się pobrać galerii z backendu Mediateki.');
  }
}

export function thumbUrl(media: DriveMedia): Promise<string> {
  const link = media.thumbnailLink ?? media.webContentLink;
  if (!link) return Promise.reject(new DriveError('no-thumb', 'Brak miniaturki.'));
  return Promise.resolve(link);
}

export function fullUrl(media: DriveMedia): Promise<string> {
  const link = media.webContentLink ?? media.thumbnailLink;
  if (!link) return Promise.reject(new DriveError('no-content', 'Brak pliku.'));
  return Promise.resolve(link);
}

export function clearBlobCache(): void {
  // Pozostawione dla zgodności z wcześniejszą wersją. Linki są teraz URL-ami backendu,
  // a nie lokalnymi Blob URL, więc nie ma czego zwalniać.
}

interface UploadSession {
  sessionUrl: string;
  chunkSize?: number;
  maxUploadBytes?: number;
}

interface ChunkResult {
  status: number;
  range?: string | null;
  responseText?: string;
}

function putChunk(
  sessionUrl: string,
  chunk: Blob,
  start: number,
  endExclusive: number,
  total: number,
  mimeType: string,
  onProgress: (loadedWithinChunk: number) => void,
): Promise<ChunkResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUrl);
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${endExclusive - 1}/${total}`);
    if (mimeType) xhr.setRequestHeader('Content-Type', mimeType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(ev.loaded);
    };
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        range: xhr.getResponseHeader('Range'),
        responseText: xhr.responseText,
      });
    };
    xhr.onerror = () => reject(new Error('network'));
    xhr.onabort = () => reject(new Error('aborted'));
    xhr.send(chunk);
  });
}

function queryUploadStatus(sessionUrl: string, total: number): Promise<ChunkResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUrl);
    xhr.setRequestHeader('Content-Range', `bytes */${total}`);
    xhr.onload = () => resolve({ status: xhr.status, range: xhr.getResponseHeader('Range'), responseText: xhr.responseText });
    xhr.onerror = () => reject(new Error('network'));
    xhr.send();
  });
}

function nextByteFromRange(range: string | null | undefined): number | null {
  if (!range) return null;
  const match = /bytes=0-(\d+)/i.exec(range);
  if (!match) return null;
  return Number(match[1]) + 1;
}

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function uploadToDrive(
  file: File,
  uploaderName: string,
  onProgress: (fraction: number) => void,
): Promise<{ id?: string; name?: string }> {
  if (isDemoMode()) {
    throw new DriveError('demo', 'Tryb demo: wysyłanie na Google Drive jest wyłączone.');
  }

  let session: UploadSession;
  try {
    session = await apiFetch<UploadSession>('/api/uploads/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, uploader: uploaderName }),
    });
  } catch (err) {
    throw wrapApiError(err, 'Nie udało się rozpocząć wysyłania pliku.');
  }

  // Google wymaga wielokrotności 256 KiB. Backend zwraca 8 MiB.
  const rawChunk = session.chunkSize || 8 * 1024 * 1024;
  const unit = 256 * 1024;
  const chunkSize = Math.max(unit, Math.floor(rawChunk / unit) * unit);
  let start = 0;
  let lastResponse: ChunkResult | null = null;
  onProgress(0);

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    let attempt = 0;

    while (true) {
      try {
        const result = await putChunk(
          session.sessionUrl,
          chunk,
          start,
          end,
          file.size,
          file.type,
          (loaded) => onProgress(Math.min(0.999, (start + loaded) / file.size)),
        );
        lastResponse = result;

        if (result.status === 200 || result.status === 201) {
          onProgress(1);
          if (result.responseText) {
            try {
              return JSON.parse(result.responseText) as { id?: string; name?: string };
            } catch {
              return { name: file.name };
            }
          }
          return { name: file.name };
        }

        if (result.status === 308) {
          start = nextByteFromRange(result.range) ?? end;
          onProgress(Math.min(0.999, start / file.size));
          break;
        }

        if (result.status === 404) {
          throw new DriveError('upload-expired', 'Sesja wysyłania wygasła. Wybierz plik ponownie i spróbuj jeszcze raz.', 404);
        }
        if (result.status >= 500 || result.status === 429) throw new Error(`retryable-${result.status}`);
        throw new DriveError(
          `upload-${result.status}`,
          `Nie udało się wysłać pliku (błąd ${result.status}).`,
          result.status,
        );
      } catch (err) {
        if (err instanceof DriveError) throw err;
        attempt += 1;
        if (attempt > 4) {
          throw new DriveError('upload-network', 'Połączenie zostało przerwane podczas wysyłania. Spróbuj ponownie.');
        }
        await sleep(600 * 2 ** (attempt - 1));
        try {
          const status = await queryUploadStatus(session.sessionUrl, file.size);
          if (status.status === 200 || status.status === 201) {
            onProgress(1);
            return { name: file.name };
          }
          if (status.status === 308) {
            const next = nextByteFromRange(status.range);
            if (next !== null) {
              start = next;
              break;
            }
          }
        } catch {
          // Następna próba wyśle ponownie bieżący kawałek.
        }
      }
    }
  }

  if (lastResponse?.status === 200 || lastResponse?.status === 201) {
    onProgress(1);
    return { name: file.name };
  }
  throw new DriveError('upload-incomplete', 'Wysyłanie nie zostało dokończone. Spróbuj ponownie.');
}

export async function deleteFile(id: string): Promise<void> {
  if (isDemoMode()) throw new DriveError('demo', 'Tryb demo: usuwanie jest wyłączone.');
  try {
    await apiFetch<void>(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    throw wrapApiError(err, 'Nie udało się usunąć pliku.');
  }
}
