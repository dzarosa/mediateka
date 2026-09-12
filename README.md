# Mediateka — Seul → Tokio, sierpień–wrzesień 2026

Statische Gruppen-Mediathek (Fotos & Videos) für 9 Reisefreunde. **Kein Server, keine
Datenbank** — die App läuft komplett im Browser auf **GitHub Pages** und spricht direkt mit der
**Google Drive API**. Alle Uploads landen im geteilten Drive-Ordner `Korea_Japonia_2026`.

## Tech-Stack

Node 22 · Vite 7 · React 19 + TypeScript · Tailwind CSS 3.4 · framer-motion · lucide-react ·
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

## Anmelde-Ablauf

1. **Login w Mediatece** — wybór użytkownika + hasło grupowe.
2. **Autoryzacja Google Drive** (OAuth 2.0) — Google wymaga jej dla prywatnego Dysku.
   Nie trzeba używać listy „Test users”: w Google Cloud ustaw status aplikacji OAuth na
   **In production / Produkcja**. Uczestnicy nadal muszą jednorazowo zatwierdzić dostęp Google.

Ważne: samo hasło zapisane w statycznym HTML/JavaScript nie może bezpiecznie zastąpić
autoryzacji Google Drive. Do wariantu „wyłącznie login + hasło, bez okna Google” potrzebny
byłby osobny backend przechowujący poświadczenia Google po stronie serwera.

## Deployment

GitHub Actions Workflow `.github/workflows/deploy.yml`: `npm ci && npm run build` → `dist/`
wird via `actions/upload-pages-artifact` + `deploy-pages` veröffentlicht. In den Repo-Settings:
**Pages → Source: GitHub Actions**.
