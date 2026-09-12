# Mediateka 2026 — pełna konfiguracja backendu krok po kroku

Ta paczka jest przygotowana pod Twój istniejący projekt Google Cloud:

- **Projekt:** Mediateka 2026
- **Project ID:** `mediateka-2026`
- **Google OAuth Client ID:** `782690034922-rmt9neomk1ivupit7kig7frilnabcj3m.apps.googleusercontent.com`
- **Konto Google Drive:** `reisekoreajapan2026@gmail.com`
- **Frontend GitHub Pages:** `https://dzarosa.github.io`
- **Folder Drive:** `Korea_Japonia_2026`
- **Backend Cloud Run:** `mediateka-api`
- **Region:** `europe-west1`

## Jak to działa

Uczestnicy **nie logują się do Google**. Logują się tylko loginem i hasłem Mediateki.
Backend na Google Cloud Run posiada jednorazowo autoryzowane połączenie z kontem
`reisekoreajapan2026@gmail.com` i zapisuje zdjęcia oraz filmy do Google Drive.

Schemat:

`iPhone / Android / PC -> GitHub Pages -> Cloud Run -> Google Drive`

Duże pliki są wysyłane przez Google Drive **resumable upload** w kawałkach, więc nie
muszą przechodzić przez pamięć backendu jako jeden wielki plik.

---

# CZĘŚĆ A — Google Cloud / OAuth

## 1. Użyj istniejącego projektu

Nie twórz nowego projektu. W Google Cloud wybierz:

**Mediateka 2026** (`mediateka-2026`).

## 2. Włącz Google Drive API

W Google Cloud Console:

**APIs & Services -> Library -> Google Drive API -> Enable**

Jeżeli widzisz przycisk `Manage`, API jest już włączone.

## 3. Google Auth Platform -> Zielgruppe

Wejdź w:

**Google Auth Platform -> Zielgruppe / Audience**

Na czas pierwszego testu możesz pozostawić **Testing**.

W `Test users` dodaj tylko:

`reisekoreajapan2026@gmail.com`

Kasia, Ania, Robert itd. nie są Google Test Users, ponieważ nigdy nie logują się do Google.

### Ważne o trybie Testing

Dla zewnętrznej aplikacji OAuth w statusie `Testing` refresh token dla zakresu Drive może
wygasnąć po 7 dniach. Po sprawdzeniu działania przełącz aplikację na **In production** i
wygeneruj końcowy refresh token jeszcze raz.

## 4. Google Auth Platform -> Datenzugriff / Data access

Dodaj zakres:

`https://www.googleapis.com/auth/drive.file`

Nie potrzebujesz pełnego `drive` ani `drive.readonly`.

`drive.file` pozwala aplikacji zarządzać plikami utworzonymi/używanymi przez tę aplikację.

## 5. Użyj istniejącego klienta OAuth „Mediateka”

Wejdź w:

**Google Auth Platform -> Clients -> Mediateka**

Nie twórz nowego klienta.

### Authorized JavaScript origins

Może pozostać:

`https://dzarosa.github.io`

Dla backendu nie jest to najważniejsze pole, ale wpis nie przeszkadza.

### Authorized redirect URIs

Dodaj dokładnie:

`http://localhost:53682/oauth2callback`

Kliknij **Speichern / Save**.

## 6. Client Secret — użyj NOWEGO

Sekrety, które zostały wcześniej wklejone do rozmowy, traktuj jako ujawnione i wyłącz je.

W sekcji **Clientschlüssel / Client secrets**:

1. Dezaktywuj stare ujawnione sekrety.
2. Kliknij `+ Add secret`.
3. Skopiuj nowy sekret tylko do schowka.
4. Nie wklejaj go do GitHub, HTML, `config.js`, czatu ani publicznego pliku.

Pełny secret Google pokazuje tylko przy tworzeniu.

---

# CZĘŚĆ B — jednorazowe połączenie z Drive na Windows

## 7. Wymagania na komputerze

Potrzebujesz Node.js 22 lub 24.

Sprawdź w PowerShell:

```powershell
node --version
npm --version
```

## 8. Rozpakuj paczkę

Otwórz PowerShell w katalogu projektu i przejdź do backendu:

```powershell
cd server
```

## 9. Ustaw Client ID i konto właściciela

```powershell
$env:GOOGLE_CLIENT_ID="782690034922-rmt9neomk1ivupit7kig7frilnabcj3m.apps.googleusercontent.com"
$env:GOOGLE_OWNER_EMAIL="reisekoreajapan2026@gmail.com"
```

## 10. Ustaw Client Secret bez wpisywania go w poleceniu

Najbezpieczniej: po utworzeniu nowego Client Secret skopiuj go w Google Cloud, a w PowerShell:

```powershell
$env:GOOGLE_CLIENT_SECRET = Get-Clipboard
```

Sprawdzenie bez ujawniania sekretu:

```powershell
[bool]$env:GOOGLE_CLIENT_SECRET
```

Powinno zwrócić:

`True`

## 11. Wygeneruj refresh token i folder Drive

Uruchom:

```powershell
npm run auth:google
```

Skrypt pokaże link Google i uruchomi lokalny odbiornik na:

`http://localhost:53682/oauth2callback`

W Google wybierz dokładnie konto:

`reisekoreajapan2026@gmail.com`

Po zgodzie terminal wypisze:

- `GOOGLE_REFRESH_TOKEN=...`
- `DRIVE_FOLDER_ID=...`

Zapisz obie wartości prywatnie. **Nie wysyłaj ich na czat i nie commituj do GitHub.**

Jeśli folder o nazwie `Korea_Japonia_2026` nie jest dostępny dla zakresu `drive.file`, skrypt
utworzy folder aplikacji o tej nazwie. To jest prawidłowe zachowanie.

## 12. Po pierwszym teście przełącz OAuth na Production

Google Auth Platform -> **Zielgruppe / Audience** -> ustaw **In production**.

Następnie uruchom `npm run auth:google` jeszcze raz i użyj **nowego refresh tokenu** jako
ostatecznego tokenu Cloud Run.

---

# CZĘŚĆ C — Cloud Run i Secret Manager

Najprościej wykonać tę część w **Google Cloud Shell**.

## 13. Otwórz Cloud Shell

W Google Cloud kliknij ikonę terminala `>_`.

Ustaw projekt:

```bash
gcloud config set project mediateka-2026
```

Sprawdź:

```bash
gcloud config get-value project
```

Wynik musi być:

`mediateka-2026`

## 14. Włącz potrzebne API

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  drive.googleapis.com
```

## 15. Utwórz konto serwisowe Cloud Run

```bash
gcloud iam service-accounts create mediateka-api-sa \
  --display-name="Mediateka API"
```

Ustaw pomocniczą zmienną:

```bash
SA="mediateka-api-sa@mediateka-2026.iam.gserviceaccount.com"
```

## 16. Utwórz sekrety w Secret Manager

### Google Client Secret

W Cloud Shell wpisz:

```bash
read -s -p "Google Client Secret: " VALUE; echo
printf '%s' "$VALUE" | gcloud secrets create mediateka-google-client-secret \
  --data-file=- --replication-policy=automatic
unset VALUE
```

### Google Refresh Token

```bash
read -s -p "Google Refresh Token: " VALUE; echo
printf '%s' "$VALUE" | gcloud secrets create mediateka-google-refresh-token \
  --data-file=- --replication-policy=automatic
unset VALUE
```

### Hasło grupowe Mediateki

Ustaw nowe hasło, którego będą używać zwykli uczestnicy:

```bash
read -s -p "Haslo grupowe Mediateki: " VALUE; echo
printf '%s' "$VALUE" | gcloud secrets create mediateka-group-password \
  --data-file=- --replication-policy=automatic
unset VALUE
```

### Hasło Admina

```bash
read -s -p "Haslo Admina: " VALUE; echo
printf '%s' "$VALUE" | gcloud secrets create mediateka-admin-password \
  --data-file=- --replication-policy=automatic
unset VALUE
```

### Sekrety podpisujące aplikacji

```bash
openssl rand -hex 48 | tr -d '\n' | gcloud secrets create mediateka-auth-secret \
  --data-file=- --replication-policy=automatic

openssl rand -hex 48 | tr -d '\n' | gcloud secrets create mediateka-media-signing-secret \
  --data-file=- --replication-policy=automatic
```

> Jeżeli przy którymś poleceniu zobaczysz, że sekret już istnieje, nie twórz go drugi raz.
> Dodaj nową wersję poleceniem `gcloud secrets versions add NAZWA --data-file=-`.

## 17. Daj Cloud Run dostęp tylko do tych sekretów

```bash
for SECRET in \
  mediateka-google-client-secret \
  mediateka-google-refresh-token \
  mediateka-group-password \
  mediateka-admin-password \
  mediateka-auth-secret \
  mediateka-media-signing-secret
do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

# CZĘŚĆ D — wdrożenie backendu

## 18. Umieść katalog `server` w Cloud Shell

Masz dwie możliwości:

### Opcja A — po wrzuceniu projektu do GitHub

Sklonuj repozytorium i przejdź do `server`:

```bash
git clone ADRES_TWOJEGO_REPOZYTORIUM
cd NAZWA_REPO/server
```

### Opcja B — upload ZIP do Cloud Shell

W Cloud Shell użyj menu **Upload**, wyślij ZIP, potem:

```bash
unzip mediateka-github-backend-v4.zip
cd mediateka_backend_v4/server
```

Jeżeli nazwa katalogu jest inna, użyj `ls`.

## 19. Ustaw ID folderu Drive

Wklej tylko `DRIVE_FOLDER_ID` otrzymany z `npm run auth:google`:

```bash
export DRIVE_FOLDER_ID='TU_WKLEJ_ID_FOLDERU'
```

ID folderu nie jest hasłem, ale nie ma potrzeby publikować go w HTML.

## 20. Wdróż backend do Cloud Run

Będąc w katalogu `server`, wykonaj:

```bash
gcloud run deploy mediateka-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --service-account "$SA" \
  --set-env-vars "ALLOWED_ORIGINS=https://dzarosa.github.io,GOOGLE_OWNER_EMAIL=reisekoreajapan2026@gmail.com,GOOGLE_CLIENT_ID=782690034922-rmt9neomk1ivupit7kig7frilnabcj3m.apps.googleusercontent.com,DRIVE_FOLDER_ID=$DRIVE_FOLDER_ID,DRIVE_FOLDER_NAME=Korea_Japonia_2026,MAX_UPLOAD_BYTES=21474836480,SESSION_HOURS=720,MEDIA_URL_HOURS=24" \
  --set-secrets "GOOGLE_CLIENT_SECRET=mediateka-google-client-secret:latest,GOOGLE_REFRESH_TOKEN=mediateka-google-refresh-token:latest,GROUP_PASSWORD=mediateka-group-password:latest,ADMIN_PASSWORD=mediateka-admin-password:latest,AUTH_SECRET=mediateka-auth-secret:latest,MEDIA_SIGNING_SECRET=mediateka-media-signing-secret:latest"
```

Cloud Run musi być publicznie osiągalny (`--allow-unauthenticated`), ponieważ wywołuje go
przeglądarka użytkownika. Sama galeria nadal wymaga tokenu sesji Mediateki.

## 21. Odczytaj URL backendu

```bash
gcloud run services describe mediateka-api \
  --region europe-west1 \
  --format='value(status.url)'
```

Dostaniesz adres podobny do:

`https://mediateka-api-xxxxxxxxxx-ew.a.run.app`

## 22. Test backendu

Otwórz:

`https://TWOJ-URL-CLOUD-RUN/health`

Powinno być `ok: true` i brakujące zmienne powinny być puste/brak.

---

# CZĘŚĆ E — połączenie GitHub Pages z backendem

## 23. Edytuj `public/config.js`

Wstaw otrzymany URL Cloud Run:

```js
window.MEDIATEKA_CONFIG = {
  apiBaseUrl: 'https://mediateka-api-xxxxxxxxxx-ew.a.run.app',
  driveFolderName: 'Korea_Japonia_2026',
  demoMode: false,
  maxUploadBytes: 20 * 1024 * 1024 * 1024,
};
```

Nie wpisuj tu żadnego Client Secret, refresh tokenu ani hasła.

## 24. Wgraj na GitHub

Commit + push do `main`.

W GitHub:

**Settings -> Pages -> Source -> GitHub Actions**

Po udanym Actions strona powinna być dostępna pod Twoim GitHub Pages.

---

# CZĘŚĆ F — test Android / iPhone

## 25. Test użytkownika

Na iPhone lub Android:

1. Otwórz Mediatekę w Safari/Chrome.
2. Zaloguj się loginem Mediateki i hasłem grupowym.
3. Nie pojawi się żadne logowanie Google.
4. Wybierz zdjęcie lub film z galerii telefonu.
5. Wyślij plik.
6. Sprawdź folder `Korea_Japonia_2026` na koncie `reisekoreajapan2026@gmail.com`.

Sesja użytkownika Mediateki jest domyślnie ważna **30 dni** (`SESSION_HOURS=720`) i jest
zapamiętywana w przeglądarce. Użytkownik nie musi codziennie logować się ponownie.

### Duże filmy

Upload jest dzielony na fragmenty po 8 MiB i korzysta z resumable upload Google Drive.
Na iPhone podczas bardzo dużego uploadu najlepiej nie zamykać Safari i nie blokować telefonu,
bo iOS może uśpić kartę w tle.

---

# CZĘŚĆ G — najważniejsze zasady bezpieczeństwa

- `GOOGLE_CLIENT_SECRET` -> tylko Secret Manager / lokalny PowerShell.
- `GOOGLE_REFRESH_TOKEN` -> tylko Secret Manager.
- `GROUP_PASSWORD` i `ADMIN_PASSWORD` -> tylko backend / Secret Manager.
- `AUTH_SECRET` i `MEDIA_SIGNING_SECRET` -> tylko Secret Manager.
- Nigdy nie wpisuj sekretów do `public/config.js`, GitHub Pages ani repozytorium.
- Jeżeli sekret został pokazany na czacie lub w publicznym repozytorium, należy go obrócić/wyłączyć.

---

# CZĘŚĆ H — aktualizacja sekretu w przyszłości

Jeżeli np. wygenerujesz nowy Google refresh token:

```bash
read -s -p "Nowy Google Refresh Token: " VALUE; echo
printf '%s' "$VALUE" | gcloud secrets versions add mediateka-google-refresh-token --data-file=-
unset VALUE
```

Potem nowa rewizja Cloud Run może użyć `latest`:

```bash
gcloud run services update mediateka-api \
  --region europe-west1 \
  --update-secrets GOOGLE_REFRESH_TOKEN=mediateka-google-refresh-token:latest
```

Analogicznie aktualizujesz inne sekrety.

---

# CZĘŚĆ I — diagnostyka

### `redirect_uri_mismatch`

W kliencie OAuth `Mediateka` musi być dokładnie:

`http://localhost:53682/oauth2callback`

Po zmianie kliknij Save i odczekaj kilka minut.

### `access_denied`

Sprawdź, czy w trybie Testing konto `reisekoreajapan2026@gmail.com` jest Test userem.

### `invalid_grant` po kilku dniach

Jeżeli OAuth był w `Testing`, przełącz na **In production** i wygeneruj refresh token ponownie.

### `/health` pokazuje brak konfiguracji

Sprawdź Secret Manager i zmienne Cloud Run.

### CORS / 403 z GitHub Pages

`ALLOWED_ORIGINS` musi być dokładnie:

`https://dzarosa.github.io`

Nie dopisuj ścieżki repozytorium.

### Build GitHub nie przechodzi

Paczka używa oficjalnego npm registry i aktualnego workflow. Sprawdź log `Build` w GitHub Actions.

