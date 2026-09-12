import http from 'node:http';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FOLDER_NAME = process.env.DRIVE_FOLDER_NAME || 'Korea_Japonia_2026';
const OWNER_EMAIL = process.env.GOOGLE_OWNER_EMAIL || 'reisekoreajapan2026@gmail.com';
const PORT = Number(process.env.OAUTH_LOCAL_PORT || 53682);
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\nBrak GOOGLE_CLIENT_ID lub GOOGLE_CLIENT_SECRET.\n');
  console.error('Windows PowerShell:');
  console.error('$env:GOOGLE_CLIENT_ID="...apps.googleusercontent.com"');
  console.error('$env:GOOGLE_CLIENT_SECRET="GOCSPX-..."');
  console.error('npm run auth:google\n');
  process.exit(1);
}

const state = cryptoRandom();
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.search = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  login_hint: OWNER_EMAIL,
  include_granted_scopes: 'true',
  state,
}).toString();

console.log('\n=== Mediateka: jednorazowe połączenie właściciela z Google Drive ===\n');
console.log('1. W Google Cloud dodaj Authorized redirect URI:');
console.log(`   ${REDIRECT_URI}\n`);
console.log(`2. Otwórz ten adres i zaloguj się kontem: ${OWNER_EMAIL}\n`);
console.log(authUrl.toString());
console.log('\nCzekam na powrót z Google…\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end('Not found');
    return;
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('Invalid state');
    return;
  }
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Google OAuth error: ${error || 'brak kodu'}`);
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) throw new Error(JSON.stringify(token));
    if (!token.refresh_token) {
      throw new Error('Google nie zwrócił refresh_token. Cofnij dostęp aplikacji na myaccount.google.com/permissions i uruchom skrypt ponownie.');
    }

    const owner = await getOwner(token.access_token);
    if (owner.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      throw new Error(`Połączono niewłaściwe konto Google: ${owner.email}. Oczekiwano: ${OWNER_EMAIL}.`);
    }

    const folderId = await ensureFolder(token.access_token);

    console.log('\n=== GOTOWE ===\n');
    console.log(`Konto Google: ${owner.email}`);
    console.log('Skopiuj te wartości do sekretów backendu / Cloud Run:');
    console.log(`GOOGLE_OWNER_EMAIL=${OWNER_EMAIL}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`);
    console.log(`DRIVE_FOLDER_ID=${folderId}`);
    console.log(`DRIVE_FOLDER_NAME=${FOLDER_NAME}`);
    console.log('\nRefresh token traktuj jak hasło — nie commituj go do GitHub.\n');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;background:#0b0b12;color:#fff;padding:40px"><h1>Mediateka połączona z Google Drive ✅</h1><p>Konto: <b>${OWNER_EMAIL}</b></p><p>Folder został przygotowany. Wróć do okna terminala — tam są wartości do Cloud Run.</p><p>To okno możesz zamknąć.</p></body>`);
    setTimeout(() => server.close(() => process.exit(0)), 500);
  } catch (e) {
    console.error('\nBłąd:', e?.message || e);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Błąd konfiguracji: ${e?.message || e}`);
  }
});

server.listen(PORT, '127.0.0.1');
setTimeout(() => {
  console.error('\nLimit czasu minął. Uruchom skrypt ponownie.');
  server.close(() => process.exit(1));
}, 10 * 60 * 1000).unref();

async function getOwner(accessToken) {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.user?.emailAddress) throw new Error(`Drive about: ${JSON.stringify(data)}`);
  return { email: data.user.emailAddress, displayName: data.user.displayName || '' };
}

async function ensureFolder(accessToken) {
  const q = encodeURIComponent(`name='${escapeQuery(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=10`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const list = await listRes.json();
  if (!listRes.ok) throw new Error(`Drive list: ${JSON.stringify(list)}`);
  if (list.files?.[0]?.id) return list.files[0].id;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { mediatekaRoot: '1' },
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok || !created.id) throw new Error(`Drive create folder: ${JSON.stringify(created)}`);
  return created.id;
}

function escapeQuery(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function cryptoRandom() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
