import { getConfig, isDemoMode } from '@/config';
import { clearSession, getSessionToken, type GateSession, type GateUser } from '@/lib/gate';

export class ApiError extends Error {
  readonly status?: number;
  readonly friendly: string;
  readonly code?: string;

  constructor(message: string, friendly: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.friendly = friendly;
    this.code = code;
  }
}

function baseUrl(): string {
  const base = getConfig().apiBaseUrl;
  if (!base && !isDemoMode()) {
    throw new ApiError('Backend not configured', 'Backend Mediateki nie jest jeszcze skonfigurowany.');
  }
  return base;
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  const friendly =
    typeof body.message === 'string'
      ? body.message
      : res.status === 401
        ? 'Sesja wygasła. Zaloguj się ponownie.'
        : `Błąd serwera Mediateki (${res.status}).`;
  return new ApiError(
    `API ${res.status}`,
    friendly,
    res.status,
    typeof body.error === 'string' ? body.error : undefined,
  );
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (auth) {
    const token = getSessionToken();
    if (!token) throw new ApiError('No session', 'Sesja wygasła. Zaloguj się ponownie.', 401);
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await parseError(res);
    if (err.status === 401) {
      clearSession();
      window.dispatchEvent(new Event('mediateka:session-expired'));
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function loginApi(username: string, password: string): Promise<GateSession> {
  const data = await apiFetch<{ token: string; user: GateUser }>(
    '/api/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
    false,
  );
  return { user: data.user, token: data.token };
}
