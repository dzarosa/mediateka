# Mediateka 2026 — konfiguracja bez logowania Google dla uczestników

Ta wersja działa w układzie:

**login Mediateki → galeria → automatyczny zapis na Google Drive**

Uczestnicy **nie logują się do Google**. Nie trzeba dodawać Kasi, Ani, Staszka itd. jako Google „Test users”. Google OAuth wykonuje tylko właściciel galerii **jednorazowo podczas konfiguracji backendu**.

> Ważne: frontend jest nadal na GitHub Pages, ale sekrety i prawdziwa kontrola hasła są w `server/`, który trzeba wdrożyć np. do Google Cloud Run.

---

## 1. GitHub Pages

Repozytorium zawiera gotowy workflow `.github/workflows/deploy.yml`.

1. Wgraj całą zawartość paczki do repozytorium GitHub (bez `node_modules`).
2. Otwórz **Settings → Pages**.
3. Ustaw **Source → GitHub Actions**.
4. Po pushu sprawdź zakładkę **Actions**.

Błąd ze screena:

```text
getaddrinfo ENOTFOUND npm.mirrors.msh.team
```

jest w tej paczce naprawiony: npm jest wymuszony na `https://registry.npmjs.org/`.

---

## 2. Google Cloud — Drive API

Utwórz albo użyj projektu Google Cloud.

1. **APIs & Services → Library → Google Drive API → Enable**.
2. Skonfiguruj **Google Auth Platform / OAuth consent screen**.
3. Dla stabilnego refresh tokenu ustaw publikację aplikacji na **In production / Produkcja**.
4. Utwórz OAuth Client typu **Web application**, np. `Mediateka Backend`.
5. Dodaj **Authorized redirect URI**:

```text
http://localhost:53682/oauth2callback
```

Zapisz:

- `Client ID`
- `Client secret`

Używany scope to tylko:

```text
https://www.googleapis.com/auth/drive.file
```

Dzięki temu backend pracuje tylko z plikami utworzonymi przez tę aplikację, zamiast otrzymywać szeroki dostęp do całego Dysku.

---

## 3. Jednorazowe połączenie właściciela z Google Drive

Na swoim komputerze otwórz PowerShell w katalogu projektu:

```powershell
cd server
$env:GOOGLE_CLIENT_ID="TU_CLIENT_ID.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="TU_CLIENT_SECRET"
npm run auth:google
```

Skrypt wypisze link. Otwórz go w przeglądarce i zaloguj się **kontem Google właściciela galerii**.

Po zgodzie skrypt:

- utworzy (lub znajdzie dostępny dla aplikacji) folder `Korea_Japonia_2026`,
- wypisze `GOOGLE_REFRESH_TOKEN`,
- wypisze `DRIVE_FOLDER_ID`.

Skopiuj te dwie wartości w bezpieczne miejsce. **Nie commituj refresh tokenu do GitHub.**

---

## 4. Backend — zmienne środowiskowe

Wzór znajduje się w `server/.env.example`.

W Cloud Run ustaw co najmniej:

```text
ALLOWED_ORIGINS=https://TWOJ-USER.github.io
GROUP_PASSWORD=NOWE_HASLO_DLA_GRUPY
ADMIN_PASSWORD=NOWE_HASLO_ADMINA
AUTH_SECRET=DLUGI_LOSOWY_SEKRET_1
MEDIA_SIGNING_SECRET=DLUGI_LOSOWY_SEKRET_2
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
DRIVE_FOLDER_ID=...
DRIVE_FOLDER_NAME=Korea_Japonia_2026
MAX_UPLOAD_BYTES=21474836480
SESSION_HOURS=24
MEDIA_URL_HOURS=24
```

`ALLOWED_ORIGINS` to **origin**, bez nazwy repozytorium. Jeżeli strona jest pod:

```text
https://dariusz.github.io/mediateka/
```

to wpisujesz:

```text
https://dariusz.github.io
```

Dla kilku originów rozdziel je przecinkami.

### Losowe sekrety w PowerShell

Możesz wygenerować je np. tak:

```powershell
-join ((1..48) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

Uruchom polecenie dwa razy — osobno dla `AUTH_SECRET` i `MEDIA_SIGNING_SECRET`.

> Ponieważ wcześniejsza wersja aplikacji miała hasła w frontendzie, ustaw teraz **nowe** `GROUP_PASSWORD` i `ADMIN_PASSWORD`.

---

## 5. Wdrożenie `server/` do Google Cloud Run

Backend ma własny `Dockerfile` i nie potrzebuje dodatkowych paczek npm.

Najprościej z Google Cloud SDK:

```powershell
cd server
gcloud run deploy mediateka-api --source . --region europe-west1 --allow-unauthenticated
```

Po pierwszym wdrożeniu w Google Cloud Console otwórz:

**Cloud Run → mediateka-api → Edit & deploy new revision → Variables & Secrets**

i wpisz zmienne z punktu 4.

Cloud Run musi mieć **Allow unauthenticated**, ponieważ stronę logowania musi dać się wywołać z przeglądarki. Dane galerii i operacje na Drive są mimo tego chronione własnym tokenem sesji Mediateki, a pliki otrzymują czasowo podpisane URL-e.

Po wdrożeniu otrzymasz adres podobny do:

```text
https://mediateka-api-xxxxxxxxxx-ew.a.run.app
```

Sprawdzenie:

```text
https://TWÓJ-BACKEND/health
```

Powinno zwrócić `"ok": true`.

---

## 6. Połącz GitHub Pages z backendem

Edytuj:

```text
public/config.js
```

oraz wpisz URL Cloud Run:

```js
window.MEDIATEKA_CONFIG = {
  apiBaseUrl: 'https://mediateka-api-xxxxxxxxxx-ew.a.run.app',
  driveFolderName: 'Korea_Japonia_2026',
  demoMode: false,
  maxUploadBytes: 20 * 1024 * 1024 * 1024,
};
```

Commit + push. GitHub Actions przebuduje stronę.

---

## 7. Logowanie użytkowników

Na stronie pozostają te same nazwy użytkowników:

- Kasia
- Bogusia
- Ania
- Robert
- Hubert
- Maria
- Staszek
- Klaudia
- Admin

Dla wszystkich poza Adminem backend sprawdza `GROUP_PASSWORD`. Admin używa `ADMIN_PASSWORD`.

Po poprawnym logowaniu użytkownik przechodzi **od razu do galerii**. Nie ma drugiego ekranu Google.

---

## 8. Duże filmy

Ta wersja nie używa starego uploadu `multipart` 200 MB. Backend otwiera Google **resumable upload session**, a przeglądarka wysyła plik w kawałkach po 8 MiB bezpośrednio do Google Drive.

Domyślny limit aplikacji to 20 GiB na plik. Możesz go zmienić w dwóch miejscach:

- backend: `MAX_UPLOAD_BYTES`,
- frontend: `public/config.js → maxUploadBytes`.

W razie chwilowego problemu sieciowego klient próbuje sprawdzić stan sesji i kontynuować upload zamiast zaczynać cały film od zera.

---

## 9. Prywatność plików

Pliki w Google Drive nie muszą być ustawione jako „Anyone with the link”. Backend czyta prywatne pliki przy użyciu refresh tokenu właściciela i udostępnia je stronie przez podpisane, czasowe URL-e.

Dla filmów endpoint obsługuje nagłówek `Range`, więc przeglądarka może przewijać i streamować dłuższy film bez pobierania go najpierw w całości do pamięci.

---

## 10. Najczęstsze problemy

| Problem | Rozwiązanie |
|---|---|
| GitHub Action: `ENOTFOUND npm.mirrors.msh.team` | Ta paczka ma już oficjalny registry npm w `.npmrc`, workflow i lockfile. |
| Strona pokazuje „Brak adresu Backend API” | Wpisz URL Cloud Run w `public/config.js`. |
| `health` pokazuje `ok:false` | W Cloud Run brakuje którejś wymaganej zmiennej środowiskowej. |
| Login zwraca 403 / CORS | `ALLOWED_ORIGINS` musi być dokładnie originem GitHub Pages, np. `https://user.github.io`. |
| Login działa, ale Drive zwraca błąd | Sprawdź `GOOGLE_REFRESH_TOKEN`, `DRIVE_FOLDER_ID` oraz czy Drive API jest włączone. |
| Refresh token przestaje działać po kilku dniach | Ustaw OAuth app na **In production / Produkcja** i wygeneruj refresh token ponownie. |
| Film nie ma jeszcze miniatury | Google może przez chwilę przetwarzać film; strona pokaże tymczasową planszę. |
| Repo było wcześniej publiczne | Zmień stare hasła grupowe i admina — wcześniej były zapisane w frontendzie. |

---

## Co jest chronione gdzie

- **GitHub Pages:** tylko interfejs, nazwy użytkowników i publiczne assety.
- **Cloud Run:** hasła, sesje, Google OAuth refresh token, podpisy URL-i.
- **Google Drive:** prywatne oryginalne zdjęcia i filmy.

Uczestnik nie musi znać ani posiadać konta Google użytego przez backend.

## Jeśli repozytorium zawiera pliki ze starej wersji OAuth

Starsza wersja Mediateki miała pliki `src/components/RequireGoogle.tsx` i
`src/lib/google.ts`. Nowa wersja nie korzysta już z logowania Google w
przeglądarce. Paczka zawiera neutralne pliki zgodności, a workflow GitHub
Actions dodatkowo usuwa te dwa stare moduły przed kompilacją. Dzięki temu
pozostałości po wcześniejszej wersji repozytorium nie powodują błędów
TypeScript `googleStatus`, `signInGoogle`, `enterDemo` ani `googleClientId`.
