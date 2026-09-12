// ============================================================================
// Mediateka — Seul → Tokio, sierpień–wrzesień 2026 · Konfiguracja runtime
// ----------------------------------------------------------------------------
// Diese Datei kann OHNE Neu-Build geändert werden (GitHub Pages serviert sie
// statisch). Nach dem Editieren: committen & pushen — fertig.
//
// WICHTIG: Die App funktioniert SOFORT auch OHNE Google Client ID —
// sie startet dann automatisch im Demo-Modus (Beispielbilder, kein Drive).
// Google Drive ist ein optionaler Zusatz (Schritte 3–5 in GITHUB-SETUP.md):
//   1. Google Cloud Projekt → „Google Drive API" aktivieren
//   2. OAuth-Zustimmungsbildschirm (Extern) + Test-User eintragen
//   3. OAuth-Client-ID (Webanwendung) mit JavaScript-Ursprung
//      https://<dein-user>.github.io erstellen
//   4. Client-ID unten eintragen
// ============================================================================
window.MEDIATEKA_CONFIG = {
  // TODO: eigene Google OAuth Client ID eintragen, z. B.
  // '1234567890-abcdefgh.apps.googleusercontent.com'
  // Solange hier der Platzhalter steht, läuft die App automatisch im Demo-Modus.
  googleClientId: 'HIER_GOOGLE_CLIENT_ID_EINTRAGEN.apps.googleusercontent.com',

  // Name des geteilten Google-Drive-Ordners (muss exakt so heißen)
  driveFolderName: 'Korea_Japonia_2026',

  // Demo-Modus: wird AUTOMATISCH aktiviert, wenn oben keine echte Client-ID
  // eingetragen ist. Auf true setzen, um den Demo-Modus auch MIT eingetragener
  // Client-ID zu erzwingen (z. B. für eine reine Vorschau ohne Drive-Zugriff).
  demoMode: false,
};
