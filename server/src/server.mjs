import http from 'node:http';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

const PORT = Number(process.env.PORT || 8080);
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FOLDER_NAME = process.env.DRIVE_FOLDER_NAME || 'Korea_Japonia_2026';
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 ** 3);
const SESSION_HOURS = Math.max(1, Number(process.env.SESSION_HOURS || 720));
const MEDIA_URL_HOURS = Math.max(1, Number(process.env.MEDIA_URL_HOURS || 24));

const USERS = [
  { username: 'kasia', displayName: 'Kasia', isAdmin: false },
  { username: 'bogusia', displayName: 'Bogusia', isAdmin: false },
  { username: 'ania_p', displayName: 'Ania', isAdmin: false },
  { username: 'rober_p', displayName: 'Robert', isAdmin: false },
  { username: 'hubert_p', displayName: 'Hubert', isAdmin: false },
  { username: 'maria', displayName: 'Maria', isAdmin: false },
  { username: 'staszek', displayName: 'Staszek', isAdmin: false },
  { username: 'klaudia', displayName: 'Klaudia', isAdmin: false },
  { username: 'anna_s', displayName: 'Anna_S', isAdmin: false },
  { username: 'admin', displayName: 'Admin', isAdmin: true },
];

const requiredEnv = [
  'GROUP_PASSWORD',
  'ADMIN_PASSWORD',
  'AUTH_SECRET',
  'MEDIA_SIGNING_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'GOOGLE_OWNER_EMAIL',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Brak wymaganych zmiennych środowiskowych: ${missingEnv.join(', ')}`);
}

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

let accessTokenCache = null;
let googleOwnerVerified = false;
let folderIdCache = process.env.DRIVE_FOLDER_ID?.trim() || null;
const loginAttempts = new Map();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}


function mediaExt(name = '') {
  const value = String(name || '').toLowerCase();
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index) : '';
}

const MEDIA_MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.qt': 'video/quicktime',
  '.hevc': 'video/hevc', '.h265': 'video/hevc', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.3gp': 'video/3gpp', '.3g2': 'video/3gpp2',
};

function normalizedMediaMime(name, reported = '') {
  const clean = String(reported || '').trim().toLowerCase();
  if (clean.startsWith('image/') || clean.startsWith('video/')) return clean;
  return MEDIA_MIME_BY_EXT[mediaExt(name)] || clean || 'application/octet-stream';
}

function hmac(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function signSession(user) {
  const payload = {
    u: user.username,
    d: user.displayName,
    a: user.isAdmin === true,
    exp: nowSeconds() + SESSION_HOURS * 3600,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = hmac(body, process.env.AUTH_SECRET || 'missing');
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.', 2);
  const expected = hmac(body, process.env.AUTH_SECRET || 'missing');
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(fromB64url(body));
    if (!payload?.u || Number(payload.exp) <= nowSeconds()) return null;
    const user = USERS.find((u) => u.username === payload.u);
    if (!user) return null;
    return { ...user };
  } catch {
    return null;
  }
}

function signMedia(id, variant, exp, download = false) {
  const value = `${id}:${variant}:${exp}:${download ? '1' : '0'}`;
  return hmac(value, process.env.MEDIA_SIGNING_SECRET || 'missing');
}

function verifyMediaSignature(id, variant, url) {
  const exp = Number(url.searchParams.get('exp') || 0);
  const download = url.searchParams.get('download') === '1';
  const sig = url.searchParams.get('sig') || '';
  if (!exp || exp < nowSeconds()) return { ok: false, download };
  const expected = signMedia(id, variant, exp, download);
  return { ok: safeEqual(sig, expected), download };
}

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  const data = Buffer.from(body);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function applyCors(req, res) {
  const origin = req.headers.origin?.replace(/\/$/, '');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Range');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length,Content-Range,Accept-Ranges,Content-Disposition,Range',
  );
}

function requireAllowedOrigin(req, res) {
  const origin = req.headers.origin?.replace(/\/$/, '');
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  json(res, 403, { error: 'origin_not_allowed', message: 'Ten adres strony nie ma dostępu do API.' });
  return false;
}

async function readJson(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error('body_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('invalid_json'), { status: 400 });
  }
}

function getBearer(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] || null;
}

function requireAuth(req, res, { admin = false } = {}) {
  const user = verifySession(getBearer(req));
  if (!user) {
    json(res, 401, { error: 'session_expired', message: 'Sesja wygasła. Zaloguj się ponownie.' });
    return null;
  }
  if (admin && !user.isAdmin) {
    json(res, 403, { error: 'admin_required', message: 'Ta operacja jest dostępna tylko dla admina.' });
    return null;
  }
  return user;
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function loginRateAllowed(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 10 * 60 * 1000) {
    entry.start = now;
    entry.count = 0;
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count <= 25;
}

async function getGoogleAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token;
  }
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
    grant_type: 'refresh_token',
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error('Google token refresh failed:', response.status, data);
    throw Object.assign(new Error('google_auth_failed'), { status: 502 });
  }
  const expectedOwner = String(process.env.GOOGLE_OWNER_EMAIL || '').trim().toLowerCase();
  if (expectedOwner && !googleOwnerVerified) {
    const aboutResponse = await fetch(`${DRIVE_API}/about?fields=${encodeURIComponent('user(emailAddress,displayName)')}`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const about = await aboutResponse.json().catch(() => ({}));
    const actualOwner = String(about?.user?.emailAddress || '').trim().toLowerCase();
    if (!aboutResponse.ok || !actualOwner) {
      console.error('Google owner verification failed:', aboutResponse.status, about);
      throw Object.assign(new Error('google_owner_check_failed'), { status: 502 });
    }
    if (actualOwner !== expectedOwner) {
      console.error(`Wrong Google account: expected ${expectedOwner}, got ${actualOwner}`);
      throw Object.assign(new Error('google_owner_mismatch'), { status: 502 });
    }
    googleOwnerVerified = true;
    console.log(`Google Drive połączony jako ${actualOwner}`);
  }

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000,
  };
  return accessTokenCache.token;
}

async function googleFetch(url, init = {}) {
  const token = await getGoogleAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  let response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    accessTokenCache = null;
    const retryToken = await getGoogleAccessToken();
    headers.set('Authorization', `Bearer ${retryToken}`);
    response = await fetch(url, { ...init, headers });
  }
  return response;
}

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function ensureFolder() {
  if (folderIdCache) return folderIdCache;
  const q = encodeURIComponent(
    `name='${escapeDriveQuery(DRIVE_FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const list = await googleFetch(
    `${DRIVE_API}/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=10`,
  );
  if (!list.ok) {
    throw Object.assign(new Error(`folder_list_${list.status}`), { status: 502 });
  }
  const listed = await list.json();
  if (listed.files?.[0]?.id) {
    folderIdCache = listed.files[0].id;
    return folderIdCache;
  }
  const created = await googleFetch(`${DRIVE_API}/files?fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { mediatekaRoot: '1' },
    }),
  });
  const data = await created.json().catch(() => ({}));
  if (!created.ok || !data.id) {
    console.error('Folder create failed:', created.status, data);
    throw Object.assign(new Error('folder_create_failed'), { status: 502 });
  }
  folderIdCache = data.id;
  console.log(`Utworzono folder Drive ${DRIVE_FOLDER_NAME}: ${folderIdCache}`);
  return folderIdCache;
}

function publicBase(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

function signedMediaUrl(req, id, variant, download = false) {
  const exp = nowSeconds() + MEDIA_URL_HOURS * 3600;
  const sig = signMedia(id, variant, exp, download);
  const qs = new URLSearchParams({ exp: String(exp), sig });
  if (download) qs.set('download', '1');
  return `${publicBase(req)}/api/media/${encodeURIComponent(id)}/${variant}?${qs}`;
}

async function listMedia(req) {
  const folderId = await ensureFolder();
  const fields =
    'files(id,name,mimeType,thumbnailLink,webViewLink,size,createdTime,appProperties,videoMediaMetadata,imageMediaMetadata),nextPageToken';
  const q = encodeURIComponent(`'${escapeDriveQuery(folderId)}' in parents and trashed=false`);
  const out = [];
  let pageToken = '';
  do {
    const pt = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const response = await googleFetch(
      `${DRIVE_API}/files?q=${q}&fields=${encodeURIComponent(fields)}&orderBy=${encodeURIComponent('createdTime desc')}&pageSize=200${pt}`,
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Drive list failed:', response.status, data);
      throw Object.assign(new Error('drive_list_failed'), { status: 502 });
    }
    for (const f of data.files || []) {
      const effectiveMime = normalizedMediaMime(f.name, f.mimeType);
      const isImage = effectiveMime.startsWith('image/');
      const isVideo = effectiveMime.startsWith('video/');
      if (!isImage && !isVideo) continue;
      out.push({
        id: f.id,
        name: f.name,
        mimeType: effectiveMime,
        type: isVideo ? 'video' : 'photo',
        thumbnailLink: signedMediaUrl(req, f.id, 'thumb'),
        webContentLink: signedMediaUrl(req, f.id, 'content'),
        downloadLink: signedMediaUrl(req, f.id, 'content', true),
        webViewLink: f.webViewLink,
        size: f.size ? Number(f.size) : undefined,
        createdTime: f.createdTime,
        uploader: f.appProperties?.uploader,
        durationMs: f.videoMediaMetadata?.durationMillis
          ? Number(f.videoMediaMetadata.durationMillis)
          : undefined,
        width: f.imageMediaMetadata?.width ?? f.videoMediaMetadata?.width,
        height: f.imageMediaMetadata?.height ?? f.videoMediaMetadata?.height,
      });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return { folderId, folderName: DRIVE_FOLDER_NAME, items: out };
}

async function getFileMeta(id) {
  const response = await googleFetch(
    `${DRIVE_API}/files/${encodeURIComponent(id)}?fields=${encodeURIComponent('id,name,mimeType,thumbnailLink,parents,trashed,size')}&supportsAllDrives=true`,
  );
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) return null;
  if (!response.ok) {
    console.error('Drive metadata failed:', response.status, data);
    throw Object.assign(new Error('drive_metadata_failed'), { status: 502 });
  }
  return data;
}

async function assertInGallery(id) {
  const [folderId, meta] = await Promise.all([ensureFolder(), getFileMeta(id)]);
  if (!meta || meta.trashed || !Array.isArray(meta.parents) || !meta.parents.includes(folderId)) {
    return null;
  }
  return meta;
}

async function proxyResponse(upstream, res, { filename, download = false, streaming = false, contentType } = {}) {
  const headers = {};
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    if (streaming && name === 'content-length') continue;
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  if (contentType) headers['content-type'] = contentType;
  headers['Cache-Control'] = 'private, max-age=900';
  if (filename) {
    const encoded = encodeURIComponent(filename).replace(/'/g, '%27');
    headers['Content-Disposition'] = `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encoded}`;
  }
  res.writeHead(upstream.status, headers);
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

async function handleMediaProxy(req, res, id, variant, url) {
  const signature = verifyMediaSignature(id, variant, url);
  if (!signature.ok) {
    json(res, 403, { error: 'invalid_media_link', message: 'Link do pliku wygasł. Odśwież galerię.' });
    return;
  }
  const meta = await assertInGallery(id);
  if (!meta) {
    json(res, 404, { error: 'not_found', message: 'Nie znaleziono pliku.' });
    return;
  }

  if (variant === 'thumb') {
    if (meta.thumbnailLink) {
      let thumb = await googleFetch(meta.thumbnailLink, { headers: { Accept: 'image/*' } });
      if (!thumb.ok) {
        // thumbnailLink bywa już sam w sobie krótkotrwałym adresem Google.
        thumb = await fetch(meta.thumbnailLink, { headers: { Accept: 'image/*' } });
      }
      if (thumb.ok) {
        await proxyResponse(thumb, res, { filename: meta.name });
        return;
      }
    }
    if (normalizedMediaMime(meta.name, meta.mimeType).startsWith('image/')) {
      const image = await googleFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media`, {
        headers: { Accept: 'image/*' },
      });
      if (image.ok) {
        await proxyResponse(image, res, { filename: meta.name });
        return;
      }
    }
    const placeholder = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#15151f"/><circle cx="320" cy="180" r="50" fill="#A78BFA" opacity=".9"/><polygon points="305,150 305,210 350,180" fill="#0B0B12"/><text x="320" y="270" text-anchor="middle" fill="#aaa6b7" font-family="sans-serif" font-size="22">Film jest przetwarzany…</text></svg>`;
    text(res, 200, placeholder, 'image/svg+xml; charset=utf-8');
    return;
  }

  if (req.method === 'HEAD') {
    const encoded = encodeURIComponent(meta.name).replace(/'/g, '%27');
    const headHeaders = {
      'Content-Type': normalizedMediaMime(meta.name, meta.mimeType),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=900',
      'Content-Disposition': `${signature.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encoded}`,
    };
    if (meta.size) headHeaders['Content-Length'] = String(meta.size);
    res.writeHead(200, headHeaders);
    res.end();
    return;
  }

  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;
  const upstream = await googleFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media`, {
    method: 'GET',
    headers,
  });
  if (!upstream.ok && upstream.status !== 206) {
    const details = await upstream.text().catch(() => '');
    console.error('Drive media stream failed:', upstream.status, details.slice(0, 500));
    json(res, 502, { error: 'media_stream_failed', message: 'Nie udało się odczytać pliku z Drive.' });
    return;
  }
  // Bez Content-Length Node używa Transfer-Encoding: chunked. To pozwala Cloud Run
  // streamować odpowiedzi większe niż 32 MiB zamiast buforować cały film.
  await proxyResponse(upstream, res, { filename: meta.name, download: signature.download, streaming: true, contentType: normalizedMediaMime(meta.name, meta.mimeType) });
}

async function handleLogin(req, res) {
  if (!loginRateAllowed(req)) {
    json(res, 429, { error: 'too_many_attempts', message: 'Za dużo prób logowania. Spróbuj za kilka minut.' });
    return;
  }
  const { username, password } = await readJson(req);
  const user = USERS.find((u) => u.username === String(username || '').trim());
  if (!user || typeof password !== 'string') {
    json(res, 401, { error: 'invalid_login', message: 'Nieprawidłowy login lub hasło.' });
    return;
  }
  const expected = user.isAdmin ? process.env.ADMIN_PASSWORD || '' : process.env.GROUP_PASSWORD || '';
  if (!expected || !safeEqual(password, expected)) {
    json(res, 401, { error: 'invalid_login', message: 'Nieprawidłowy login lub hasło.' });
    return;
  }
  const token = signSession(user);
  json(res, 200, { token, user, expiresIn: SESSION_HOURS * 3600 });
}

async function handleUploadSession(req, res, user) {
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const mimeType = normalizedMediaMime(name, body.mimeType);
  const size = Number(body.size || 0);
  const uploadId = String(body.uploadId || '').trim();
  if (!name || !Number.isFinite(size) || size <= 0) {
    json(res, 400, { error: 'invalid_file', message: 'Brak nazwy lub rozmiaru pliku.' });
    return;
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(uploadId)) {
    json(res, 400, { error: 'invalid_upload_id', message: 'Nieprawidłowy identyfikator uploadu.' });
    return;
  }
  if (size > MAX_UPLOAD_BYTES) {
    json(res, 413, {
      error: 'file_too_large',
      message: `Plik przekracza limit ${Math.round(MAX_UPLOAD_BYTES / 1024 ** 3)} GB.`,
    });
    return;
  }
  if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
    json(res, 415, { error: 'unsupported_type', message: 'Dozwolone są tylko zdjęcia i filmy.' });
    return;
  }
  const folderId = await ensureFolder();
  const response = await googleFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=${encodeURIComponent('id,name,mimeType,size,createdTime')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
      },
      body: JSON.stringify({
        name,
        parents: [folderId],
        appProperties: { uploader: user.username, mediateka: '1', uploadId },
      }),
    },
  );
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('Resumable init failed:', response.status, details.slice(0, 1000));
    json(res, 502, { error: 'upload_init_failed', message: 'Nie udało się rozpocząć wysyłania do Drive.' });
    return;
  }
  const sessionUrl = response.headers.get('location');
  if (!sessionUrl) {
    json(res, 502, { error: 'upload_url_missing', message: 'Google nie zwrócił adresu sesji wysyłania.' });
    return;
  }
  json(res, 200, {
    sessionUrl,
    uploadId,
    chunkSize: 8 * 1024 * 1024,
    maxUploadBytes: MAX_UPLOAD_BYTES,
  });
}

async function handleUploadStatus(req, res, url) {
  const uploadId = String(url.searchParams.get('uploadId') || '').trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(uploadId)) {
    json(res, 400, { error: 'invalid_upload_id', message: 'Nieprawidłowy identyfikator uploadu.' });
    return;
  }

  const folderId = await ensureFolder();
  const q = encodeURIComponent(
    `'${escapeDriveQuery(folderId)}' in parents and trashed=false and appProperties has { key='uploadId' and value='${escapeDriveQuery(uploadId)}' }`,
  );
  const fields = 'files(id,name,mimeType,size,createdTime,appProperties)';
  const response = await googleFetch(
    `${DRIVE_API}/files?q=${q}&spaces=drive&fields=${encodeURIComponent(fields)}&orderBy=${encodeURIComponent('createdTime desc')}&pageSize=5`,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Upload status check failed:', response.status, data);
    json(res, 502, { error: 'upload_status_failed', message: 'Nie udało się potwierdzić uploadu.' });
    return;
  }

  const file = data.files?.[0];
  if (!file) {
    json(res, 200, { complete: false });
    return;
  }

  json(res, 200, {
    complete: true,
    file: {
      id: file.id,
      name: file.name,
      mimeType: normalizedMediaMime(file.name, file.mimeType),
      size: file.size ? Number(file.size) : undefined,
      createdTime: file.createdTime,
    },
  });
}

async function handleDelete(req, res, id, user) {
  if (!user.isAdmin) {
    json(res, 403, { error: 'admin_required', message: 'Tylko admin może usuwać pliki.' });
    return;
  }
  const meta = await assertInGallery(id);
  if (!meta) {
    json(res, 404, { error: 'not_found', message: 'Nie znaleziono pliku.' });
    return;
  }
  const response = await googleFetch(`${DRIVE_API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    const details = await response.text().catch(() => '');
    console.error('Delete failed:', response.status, details.slice(0, 500));
    json(res, 502, { error: 'delete_failed', message: 'Nie udało się usunąć pliku z Drive.' });
    return;
  }
  res.writeHead(204, { 'Cache-Control': 'no-store' });
  res.end();
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!requireAllowedOrigin(req, res)) return;

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  try {
    if (req.method === 'GET' && path === '/health') {
      json(res, 200, {
        ok: missingEnv.length === 0,
        folderName: DRIVE_FOLDER_NAME,
        googleOwnerEmail: process.env.GOOGLE_OWNER_EMAIL || null,
        googleOwnerVerified,
        maxUploadBytes: MAX_UPLOAD_BYTES,
        sessionHours: SESSION_HOURS,
        missingEnv,
      });
      return;
    }

    if (req.method === 'POST' && path === '/api/login') {
      await handleLogin(req, res);
      return;
    }

    const mediaMatch = /^\/api\/media\/([^/]+)\/(thumb|content)$/.exec(path);
    if (mediaMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      await handleMediaProxy(req, res, decodeURIComponent(mediaMatch[1]), mediaMatch[2], url);
      return;
    }

    if (req.method === 'GET' && path === '/api/media') {
      const user = requireAuth(req, res);
      if (!user) return;
      const data = await listMedia(req);
      json(res, 200, data);
      return;
    }

    if (req.method === 'POST' && path === '/api/uploads/session') {
      const user = requireAuth(req, res);
      if (!user) return;
      await handleUploadSession(req, res, user);
      return;
    }

    if (req.method === 'GET' && path === '/api/uploads/status') {
      const user = requireAuth(req, res);
      if (!user) return;
      await handleUploadStatus(req, res, url);
      return;
    }

    const deleteMatch = /^\/api\/media\/([^/]+)$/.exec(path);
    if (deleteMatch && req.method === 'DELETE') {
      const user = requireAuth(req, res, { admin: true });
      if (!user) return;
      await handleDelete(req, res, decodeURIComponent(deleteMatch[1]), user);
      return;
    }

    json(res, 404, { error: 'not_found', message: 'Nie znaleziono endpointu.' });
  } catch (err) {
    console.error('Request failed:', err);
    const status = Number(err?.status || 500);
    const message =
      status === 400
        ? 'Nieprawidłowe dane żądania.'
        : status === 413
          ? 'Żądanie jest zbyt duże.'
          : 'Błąd serwera Mediateki. Spróbuj ponownie.';
    if (!res.headersSent) json(res, status >= 400 && status < 600 ? status : 500, { error: 'server_error', message });
    else res.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mediateka backend działa na porcie ${PORT}`);
  if (missingEnv.length) console.log('Backend uruchomił się, ale /health pokaże brakujące zmienne.');
});
