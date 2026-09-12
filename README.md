# Mediateka — Korea & Japonia 2026

Statische Gruppen-Mediathek (Fotos & Videos) für 9 Reisefreunde. **Kein Server, keine
Datenbank** — die App läuft komplett im Browser auf **GitHub Pages** und spricht direkt mit der
**Google Drive API**. Alle Uploads landen im geteilten Drive-Ordner `Korea_Japonia_2026`.

## Tech-Stack

Node 20 · Vite 7 · React 19 + TypeScript · Tailwind CSS 3.4 · framer-motion · lucide-react ·
HashRouter (GitHub Pages hat kein SPA-Fallback) · `base: './'` (relative Pfade)

## Lokale Entwicklung

```bash
npm ci
npm run dev      # Dev-Server
npm run check    # TypeScript-Check
npm run build    # Produktions-Build nach dist/
```

## Konfiguration (ohne Neu-Build)

`public/config.js` enthält:

```js
window.MEDIATEKA_CONFIG = {
  googleClientId: '…apps.googleusercontent.com',   // Google OAuth Client ID (Webanwendung)
  driveFolderName: 'Korea_Japonia_2026',           // Name des geteilten Drive-Ordners
};
```

Solange keine echte Client-ID eingetragen ist, zeigt die App einen eleganten
„Setup erforderlich"-Screen. **Ausführliche Anleitung: [GITHUB-SETUP.md](GITHUB-SETUP.md).**

## Anmelde-Ablauf (zwei Schritte)

1. **Weiche Gruppensperre** — Name-Chip + Gruppen-Passwort.
   ⚠️ **Das ist KEINE echte Sicherheit!** Die Passwörter stehen im ausgelieferten JavaScript
   (`src/lib/gate.ts`) und sind für jede:n sichtbar. Sie ist nur ein freundlicher Türrahmen.
2. **Google-Login** (OAuth 2.0, Scopes `drive.readonly` + `drive.file`) — das ist die echte
   Zugriffskontrolle: Nur Google-Konten, denen der Ordner `Korea_Japonia_2026` geteilt wurde
   („Bearbeiter"), können lesen & hochladen. Das Access-Token liegt nur im Speicher
   (kein localStorage); nach Reload wird per `requestAccessToken({prompt: ''})` still erneuert.

## Deployment

GitHub Actions Workflow `.github/workflows/deploy.yml`: `npm ci && npm run build` → `dist/`
wird via `actions/upload-pages-artifact` + `deploy-pages` veröffentlicht. In den Repo-Settings:
**Pages → Source: GitHub Actions**.
