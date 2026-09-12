# Mediateka Backend

Backend dla frontendu na GitHub Pages. Uczestnicy logują się wyłącznie loginem/hasłem Mediateki; OAuth Google jest przechowywany po stronie serwera.

## Lokalny start

Skopiuj `.env.example` do `.env` i ustaw wartości jako zmienne środowiskowe. Ten projekt nie używa biblioteki dotenv celowo — na Cloud Run wszystkie wartości powinny być ustawione jako prawdziwe environment variables / secrets.

```bash
node src/server.mjs
```

Health check:

```text
GET http://localhost:8080/health
```

## Jednorazowy refresh token

```powershell
$env:GOOGLE_CLIENT_ID="..."
$env:GOOGLE_CLIENT_SECRET="..."
npm run auth:google
```

Szczegóły są w `../GITHUB-SETUP.md`.
