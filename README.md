# Mediateka — Seul → Tokio, sierpień–wrzesień 2026

Wspólna galeria zdjęć i filmów dla 9 uczestników wyjazdu. Frontend jest publikowany na **GitHub Pages**, natomiast prywatny dostęp do **Google Drive** obsługuje mały backend w katalogu `server/`.

## Co zmieniło się w tej wersji

- uczestnicy logują się **tylko nazwą użytkownika + hasłem Mediateki** i sesja jest zapamiętywana w przeglądarce;
- nie ma przycisku „Zaloguj przez Google” i uczestnicy nie muszą być Google **Test users**;
- hasła nie znajdują się już w HTML/JavaScript — są zmiennymi środowiskowymi backendu;
- backend jest **jednorazowo** autoryzowany kontem `reisekoreajapan2026@gmail.com`; wszyscy uczestnicy korzystają z tego połączenia w tle;
- duże filmy są wysyłane przez **Google Drive resumable upload** w kawałkach (domyślny limit aplikacji: 20 GiB na plik);
- prywatne zdjęcia i filmy są odczytywane przez krótkotrwałe, podpisane URL-e backendu;
- naprawiono GitHub Actions `npm ci`: `.npmrc`, workflow i `package-lock.json` używają oficjalnego `https://registry.npmjs.org/`.

Oryginalne zdjęcie strony logowania `public/login-hero.jpg` zostało zachowane.

## Architektura

```text
Użytkownik
   │
   │ login + hasło Mediateki
   ▼
GitHub Pages (React)
   │
   │ token sesji Mediateki
   ▼
Backend (np. Google Cloud Run)
   │
   │ refresh token konta reisekoreajapan2026@gmail.com
   ▼
Google Drive / Korea_Japonia_2026
```

Frontend nigdy nie otrzymuje `GOOGLE_CLIENT_SECRET` ani `GOOGLE_REFRESH_TOKEN`.

## Frontend

```bash
npm ci
npm run dev
npm run check
npm run build
```

Runtime config: `public/config.js`.

Po wdrożeniu backendu wystarczy wpisać:

```js
window.MEDIATEKA_CONFIG = {
  apiBaseUrl: 'https://TWÓJ-BACKEND.run.app',
  driveFolderName: 'Korea_Japonia_2026',
  demoMode: false,
  maxUploadBytes: 20 * 1024 * 1024 * 1024,
};
```

## Backend

Backend jest celowo bardzo mały i używa wyłącznie modułów wbudowanych w Node.js — nie ma dodatkowych zależności npm.

Najważniejsze endpointy:

- `POST /api/login` — weryfikacja loginu i hasła Mediateki;
- `GET /api/media` — lista zdjęć/filmów;
- `POST /api/uploads/session` — utworzenie resumable upload session do Google Drive;
- `GET /api/media/:id/thumb` — prywatna miniatura przez podpisany link;
- `GET /api/media/:id/content` — prywatne zdjęcie / streaming filmu z obsługą HTTP Range;
- `DELETE /api/media/:id` — tylko Admin.

Konfigurację backendu opisuje `server/.env.example` i szczegółowo `GITHUB-SETUP.md`.

## Ważne po poprzedniej wersji

W starej wersji hasło grupowe i hasło Admina były zapisane w kodzie frontendu. Jeżeli repozytorium było już publiczne, potraktuj tamte hasła jako ujawnione i ustaw **nowe** wartości `GROUP_PASSWORD` oraz `ADMIN_PASSWORD` w backendzie.

## Deployment GitHub Pages

Workflow `.github/workflows/deploy.yml` wykonuje `npm ci` + `npm run build` i publikuje `dist/` przez GitHub Pages. W repozytorium ustaw **Settings → Pages → Source: GitHub Actions**.

Pełna instrukcja: **`GITHUB-SETUP.md`**.
