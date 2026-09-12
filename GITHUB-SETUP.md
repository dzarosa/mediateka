# Setup-Anleitung: Mediateka — Korea & Japonia 2026

Schritt für Schritt, auch ohne Programmier-Erfahrung machbar. Am Ende läuft die App auf
**GitHub Pages** und alle Fotos/Videos landen im geteilten **Google-Drive-Ordner**
`Korea_Japonia_2026`.

**Was du brauchst:** einen GitHub-Account, ein Google-Konto, ca. 20 Minuten.

---

## Schritt 1 — GitHub-Repo anlegen & Code hochladen

1. Auf <https://github.com/new> ein neues Repository erstellen, z. B. Name: `mediateka`
   (Public oder Private ist egal — GitHub Pages funktioniert bei beiden; bei Private nur mit
   GitHub Pro/Team bzw. öffentlichem Repo bei Free).
2. Den Code hochladen — zwei einfache Wege:
   - **Per Kommandozeile** (im Projektordner):
     ```bash
     git init -b main
     git add -A
     git commit -m "Mediateka — Korea & Japonia 2026"
     git remote add origin https://github.com/<DEIN-USER>/mediateka.git
     git push -u origin main
     ```
   - **Per Web-Oberfläche:** Repo öffnen → „Add file" → „Upload files" → alle Dateien &
     Ordner hineinziehen (außer `node_modules/` und `dist/`).

Ein Deployment-Workflow (`.github/workflows/deploy.yml`) ist **bereits dabei** — er baut die
App bei jedem Push automatisch (`npm ci && npm run build`) und veröffentlicht `dist/` auf
GitHub Pages. Du musst **nicht** lokal `npm run build` ausführen.

## Schritt 2 — GitHub Pages aktivieren

1. Im Repo: **Settings → Pages**.
2. Bei **Source**: **„GitHub Actions"** auswählen (nicht „Deploy from a branch").
3. Nach dem nächsten Push läuft der Workflow **„Deploy to GitHub Pages"** (Tab „Actions").
   Wenn er grün ist, ist die App unter `https://<DEIN-USER>.github.io/mediateka/` erreichbar.

> Die App ist für diesen Unterpfad vorbereitet (relative Pfade `base: './'` + Hash-Routing) —
> es funktioniert auch ohne eigene Domain.

## Schritt 3 — Google Cloud: Drive API + OAuth-Client einrichten

1. Öffne <https://console.cloud.google.com/> und erstelle oben links ein **neues Projekt**,
   z. B. `Mediateka 2026`.
2. **APIs & Dienste → Bibliothek** → suche **„Google Drive API"** → **Aktivieren**.
3. **APIs & Dienste → OAuth-Zustimmungsbildschirm**:
   - Typ: **Extern** → „Erstellen".
   - App-Name z. B. `Mediateka Korea Japonia 2026`, deine E-Mail als Support-/Kontaktadresse.
   - Scopes kannst du überspringen (die App fragt sie beim Login direkt ab).
   - **Wichtig — Testnutzer:** Trage hier die **Google-Konten aller 9 Teilnehmer:innen** ein
     (und dein eigenes). Solange die App im „Test"-Status ist, können **nur** diese Konten
     sich anmelden!
4. **APIs & Dienste → Anmeldedaten → „Anmeldedaten erstellen" → „OAuth-Client-ID"**:
   - Anwendungstyp: **Webanwendung**, Name z. B. `Mediateka GitHub Pages`.
   - **Autorisierte JavaScript-Ursprünge:** `https://<DEIN-USER>.github.io`
     (genau so, ohne `/mediateka` und ohne Slash am Ende).
   - „Erstellen" → **Client-ID kopieren** (endet auf `…apps.googleusercontent.com`).

> Weitere Hintergründe zur Drive-Einrichtung: siehe `GOOGLE-DRIVE-SETUP.md` (falls im Repo)
> bzw. die Hinweise im Admin-Panel der App.

## Schritt 4 — Client-ID in `public/config.js` eintragen

1. Im Repo die Datei **`public/config.js`** öffnen (Stift-Symbol → „Edit").
2. Den Platzhalter durch deine Client-ID ersetzen:
   ```js
   window.MEDIATEKA_CONFIG = {
     googleClientId: '1234567890-abcdef.apps.googleusercontent.com',
     driveFolderName: 'Korea_Japonia_2026',
   };
   ```
3. **Commit changes** → der Workflow baut automatisch neu → nach ca. 1–2 Minuten ist die
   Änderung live.

## Schritt 5 — Drive-Ordner anlegen & teilen

1. In deinem Google Drive: **Neu → Ordner** → Name exakt: **`Korea_Japonia_2026`**
   (Unterstriche, Groß-/Kleinschreibung beachten — oder den Namen in `config.js` anpassen).
2. Rechtsklick auf den Ordner → **Teilen** → die **9 Google-Konten** der Gruppe eintragen,
   Rolle: **„Bearbeiter"** (damit alle hochladen können). Alternativ: Link-Freigabe
   „Jeder mit dem Link → Bearbeiter" (weniger fein kontrollierbar).

## Schritt 6 — Erster Login

1. App öffnen: `https://<DEIN-USER>.github.io/mediateka/`
2. **Schritt 1 (Gruppensperre):** eigenen Namen antippen + Gruppen-Passwort eingeben
   (steht im Gruppenchat; der Admin hat ein eigenes).
3. **Schritt 2 (Google):** „Zaloguj przez Google" → dein Google-Konto wählen.
   - Beim ersten Mal erscheint evtl. **„Google hat diese App nicht verifiziert"** — das ist
     normal bei selbst erstellten Apps im Test-Modus: **„Erweitert" → „Trotzdem fortfahren
     (unsicher)"** → Berechtigungen bestätigen.
4. Fertig — hochgeladene Dateien erscheinen im Ordner `Korea_Japonia_2026`.

---

## ⚠️ Ehrlichkeits-Hinweis: Sicherheit

- Die **Passwort-Sperre (Schritt 1) ist rein client-seitig** — die Passwörter stehen im
  ausgelieferten JavaScript und sind **keine echte Sicherheit**. Sie hält nur neugierige
  Zufallsbesucher:innen höflich draußen.
- Die **echte Kontrolle** ist das Google-Konto + die Ordner-Freigabe: Ohne eingeloggtes,
  freigegebenes Google-Konto kann niemand Dateien sehen oder hochladen — egal, ob jemand das
  Gruppen-Passwort kennt.
- Wer ein Konto aus der Gruppe entfernen will: Testnutzer in Google Cloud entfernen **und**
  die Ordner-Freigabe in Drive aufheben.

## Fehlersuche

| Problem | Lösung |
|---|---|
| „Wymagana konfiguracja"-Screen | Client-ID in `public/config.js` fehlt/ist Platzhalter → Schritt 4 |
| „Error 400: origin_mismatch" beim Google-Login | JavaScript-Ursprung falsch → Schritt 3.4, exakt `https://<user>.github.io` |
| „Access blocked / App ist im Testmodus" | Google-Konto nicht als Testnutzer eingetragen → Schritt 3.3 |
| „Nie znaleziono folderu" im UI | Ordner heißt anders oder ist dem Konto nicht geteilt → Schritt 5 |
| Upload schlägt fehl (403) | Freigabe nur „Betrachter" → Rolle auf „Bearbeiter" ändern |
| Seite zeigt 404 nach Reload | Normal wäre das ohne Hash-Routing — die App nutzt `/#/…`; Repo-Name in der URL prüfen |
