# Mediateka V6 — poprawki uploadu i iPhone

Ta wersja naprawia trzy problemy:

1. **Fałszywy błąd po 100%** — każdy upload dostaje unikalny `uploadId`. Jeżeli Safari/Chrome zgubi końcową odpowiedź Google, backend sprawdza w Drive, czy plik faktycznie istnieje, zanim pokaże błąd.
2. **Brak automatycznego odświeżenia** — po udanym wysłaniu wymuszane jest świeże pobranie galerii. Udane pliki są od razu usuwane z kolejki; zostają tylko pliki, które naprawdę się nie wysłały.
3. **iPhone działa szybciej** — brak ciężkich podglądów MOV/HEVC przed uploadem, maksymalnie 12 podglądów zdjęć oraz 2 równoległe uploady. Oryginały nie są kompresowane ani zmniejszane.

HEVC/MOV z V5 pozostaje obsługiwany.

## Wdrożenie

### 1. Windows / lokalne repozytorium

Skopiuj zawartość V6 do:

`C:\Users\Dariusz Zarosa\Documents\GitHub\mediateka`

Zastąp istniejące pliki. `public/config.js` w tej paczce zachowuje aktualny URL Cloud Run.

Następnie PowerShell:

```powershell
cd "C:\Users\Dariusz Zarosa\Documents\GitHub\mediateka"
git add .
git commit -m "V6 fix upload refresh iPhone"
git push origin main
```

Poczekaj aż GitHub **Actions** będzie zielony.

### 2. Cloud Run — konieczne, bo zmienił się backend

W Google Cloud Shell:

```bash
cd ~/mediateka
git pull origin main
cd server
pwd
```

`pwd` musi kończyć się na `/mediateka/server`.

Następnie:

```bash
gcloud run deploy mediateka-api \
  --source . \
  --region europe-west1
```

Po wdrożeniu:

```bash
BACKEND_URL=$(gcloud run services describe mediateka-api \
  --region europe-west1 \
  --format='value(status.url)')

curl "$BACKEND_URL/health"
```

Oczekiwane: `"ok":true` i `"missingEnv":[]`.

## Test

1. Otwórz Mediatekę na iPhone/Android.
2. Wybierz 2–3 zdjęcia.
3. Kliknij **Wyślij**.
4. Procent ma zatrzymać się maksymalnie na **99%**, dopóki Drive nie potwierdzi pliku.
5. Po sukcesie pliki znikają z kolejki i galeria jest automatycznie odświeżona.
6. Dopiero potem przetestuj MOV/HEVC i większy film.

### Uwaga o iCloud Photos

Jeżeli oryginał zdjęcia/filmu znajduje się tylko w iCloud, iPhone musi najpierw pobrać go na urządzenie. Tego czasu aplikacja WWW nie może skrócić. V6 usuwa natomiast niepotrzebne dekodowanie wielu pełnych zdjęć i metadanych filmów po ich wybraniu.
