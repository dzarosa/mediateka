# Mediateka 2026 — GitHub + Google Drive Backend

Pełna instrukcja jest w pliku:

**`SETUP-KROK-PO-KROKU.md`**

Ta wersja jest przygotowana dla:

- Google Cloud Project ID: `mediateka-2026`
- OAuth Client ID: `782690034922-rmt9neomk1ivupit7kig7frilnabcj3m.apps.googleusercontent.com`
- Google Drive owner: `reisekoreajapan2026@gmail.com`
- GitHub Pages origin: `https://dzarosa.github.io`
- Cloud Run service: `mediateka-api`
- Drive folder: `Korea_Japonia_2026`

Uczestnicy logują się wyłącznie do Mediateki. Google OAuth działa tylko na backendzie.

## Najważniejsze

1. W istniejącym kliencie OAuth `Mediateka` dodaj redirect URI:
   `http://localhost:53682/oauth2callback`
2. Użyj świeżego Client Secret — wcześniej ujawnione sekrety dezaktywuj.
3. W `server/` uruchom `npm run auth:google` i autoryzuj tylko
   `reisekoreajapan2026@gmail.com`.
4. Zapisz `GOOGLE_REFRESH_TOKEN` i `DRIVE_FOLDER_ID` w bezpiecznym miejscu.
5. Wdróż `server/` do Cloud Run zgodnie z pełną instrukcją.
6. W `public/config.js` wpisz URL Cloud Run.
7. Commit + push do GitHub.

Żadnego Client Secret, refresh tokenu ani hasła nie wpisuj do frontendu ani repozytorium.
