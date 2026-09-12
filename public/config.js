// ============================================================================
// Mediateka — Korea & Japonia 2026 · konfiguracja runtime
// ----------------------------------------------------------------------------
// Ten plik można zmienić bez przebudowy kodu. Po zmianie: commit + push.
//
// WAŻNE: lista „Test users” NIE jest potrzebna, jeśli w Google Cloud
// status aplikacji OAuth ustawisz na „In production / Produkcja”.
// Użytkownicy nadal muszą jednorazowo potwierdzić dostęp Google, ponieważ
// prywatny Google Drive nie może być bezpiecznie otwierany samym hasłem HTML.
// Logowanie grupowe (nazwa + hasło) pozostaje pierwszym krokiem.
// ============================================================================
window.MEDIATEKA_CONFIG = {
  googleClientId: '782690034922-rmt9neomk1ivupit7kig7frilnabcj3m.apps.googleusercontent.com',
  driveFolderName: 'Korea_Japonia_2026',
  demoMode: false,
};
